export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiProviderResult<T = unknown> = {
  data: T;
  provider: string;
  model: string;
  requestId: string;
  inputTokens?: number;
  outputTokens?: number;
};

export class AiConfigurationError extends Error {
  code = "AI_CONFIGURATION_REQUIRED" as const;
  constructor(message = "AI provider configuration is required") {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiProviderError extends Error {
  code: string;
  retryable: boolean;
  constructor(message: string, code = "AI_PROVIDER_ERROR", retryable = false) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type AiGenerationRequest = {
  feature: string;
  messages: AiMessage[];
  responseSchema: Record<string, unknown>;
  schemaName: string;
  maxOutputTokens?: number;
};

function getProviderConfig() {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL ?? process.env.OPENAI_API_BASE ?? "";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  const configuredModel = process.env.AI_DEFAULT_MODEL ?? "";
  const allowedModels = (process.env.AI_ALLOWED_MODELS ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  if (!baseUrl || !apiKey) throw new AiConfigurationError();
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, configuredModel, allowedModels };
}

function modelsUrl(baseUrl: string) {
  return baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
}

function completionsUrl(baseUrl: string) {
  return baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError("AI provider request timed out", "AI_TIMEOUT", true);
    }
    throw new AiProviderError("AI provider network request failed", "AI_NETWORK_ERROR", true);
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveModel(config: ReturnType<typeof getProviderConfig>) {
  if (config.configuredModel) {
    if (config.allowedModels.length > 0 && !config.allowedModels.includes(config.configuredModel)) {
      throw new AiConfigurationError("Configured AI model is not allowed by school policy");
    }
    return config.configuredModel;
  }
  const response = await fetchWithTimeout(
    modelsUrl(config.baseUrl),
    { headers: { Authorization: `Bearer ${config.apiKey}` } },
    8_000,
  );
  if (!response.ok)
    throw new AiProviderError(
      "AI model catalog is unavailable",
      `AI_MODEL_CATALOG_${response.status}`,
      response.status >= 500 || response.status === 429,
    );
  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  const available = (payload.data ?? [])
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id));
  const filtered =
    config.allowedModels.length > 0
      ? available.filter((model) => config.allowedModels.includes(model))
      : available;
  if (!filtered[0]) throw new AiConfigurationError("No AI model is available for this school");
  return filtered[0];
}

function tokenParameter(model: string, maxOutputTokens: number) {
  return model.toLowerCase().startsWith("gpt-5")
    ? { max_completion_tokens: maxOutputTokens }
    : { max_tokens: maxOutputTokens };
}

export async function generateStructured<T>(
  request: AiGenerationRequest,
): Promise<AiProviderResult<T>> {
  const config = getProviderConfig();
  const model = await resolveModel(config);
  const requestId = crypto.randomUUID();
  const body = {
    model,
    messages: request.messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: request.responseSchema,
      },
    },
    ...tokenParameter(model, request.maxOutputTokens ?? 1400),
  };
  let response: Response | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchWithTimeout(
        completionsUrl(config.baseUrl),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
          body: JSON.stringify(body),
        },
        25_000,
      );
      if (response.ok) break;
      const responseText = await response.text();
      lastError = new AiProviderError(
        response.status === 429
          ? "AI provider rate limit reached"
          : `AI provider returned HTTP ${response.status}`,
        response.status === 429 ? "AI_PROVIDER_RATE_LIMIT" : `AI_PROVIDER_HTTP_${response.status}`,
        response.status >= 500 || response.status === 429,
      );
      if (attempt === 0 && (response.status >= 500 || response.status === 429)) continue;
      throw new AiProviderError(
        (lastError as Error).message + (responseText ? `: ${responseText.slice(0, 240)}` : ""),
        (lastError as AiProviderError).code,
        (lastError as AiProviderError).retryable,
      );
    } catch (error) {
      lastError = error;
      if (attempt === 0 && error instanceof AiProviderError && error.retryable) continue;
      throw error;
    }
  }
  if (!response?.ok)
    throw lastError instanceof Error
      ? lastError
      : new AiProviderError("AI provider request failed");
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content)
    throw new AiProviderError("AI provider returned an empty response", "AI_EMPTY_RESPONSE", true);
  let parsed: T;
  try {
    parsed = JSON.parse(content) as T;
  } catch {
    throw new AiProviderError("AI provider returned malformed JSON", "AI_MALFORMED_JSON", true);
  }
  return {
    data: parsed,
    provider: "built-in-forge",
    model,
    requestId,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
  };
}

export async function generateText(request: {
  feature: string;
  messages: AiMessage[];
  maxOutputTokens?: number;
}): Promise<AiProviderResult<string>> {
  const config = getProviderConfig();
  const model = await resolveModel(config);
  const requestId = crypto.randomUUID();
  const response = await fetchWithTimeout(
    completionsUrl(config.baseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...tokenParameter(model, request.maxOutputTokens ?? 900),
      }),
    },
    25_000,
  );
  if (!response.ok)
    throw new AiProviderError(
      `AI provider returned HTTP ${response.status}`,
      `AI_PROVIDER_HTTP_${response.status}`,
      response.status >= 500 || response.status === 429,
    );
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content)
    throw new AiProviderError("AI provider returned an empty response", "AI_EMPTY_RESPONSE", true);
  return {
    data: content,
    provider: "built-in-forge",
    model,
    requestId,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
  };
}

export function aiProviderConfigured() {
  return Boolean(
    (process.env.BUILT_IN_FORGE_API_URL ?? process.env.OPENAI_API_BASE) &&
    (process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY),
  );
}
