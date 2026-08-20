export class EmailConfigurationRequiredError extends Error {
  code = "EMAIL_CONFIGURATION_REQUIRED" as const;

  constructor() {
    super("Email provider configuration required");
    this.name = "EmailConfigurationRequiredError";
  }
}

export class EmailDeliveryError extends Error {
  code = "EMAIL_DELIVERY_FAILED" as const;

  constructor() {
    super("Email delivery failed");
    this.name = "EmailDeliveryError";
  }
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function emailConfig() {
  return {
    endpoint: process.env.EMAIL_PROVIDER_URL?.trim() ?? "",
    apiKey: process.env.EMAIL_PROVIDER_API_KEY?.trim() ?? "",
    from: process.env.EMAIL_FROM?.trim() ?? "",
  };
}

export function emailProviderState() {
  const config = emailConfig();
  return config.endpoint && config.apiKey && config.from ? "READY" : "CONFIGURATION_REQUIRED";
}

export async function sendEmail(message: EmailMessage) {
  const config = emailConfig();
  if (!config.endpoint || !config.apiKey || !config.from) {
    throw new EmailConfigurationRequiredError();
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...message, from: config.from }),
      signal: controller.signal,
    });
    if (!response.ok) throw new EmailDeliveryError();
    return { delivered: true as const };
  } catch (error) {
    if (error instanceof EmailConfigurationRequiredError || error instanceof EmailDeliveryError)
      throw error;
    throw new EmailDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendEmailWithRetry(message: EmailMessage, attempts = 2) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, Math.min(attempts, 3)); attempt += 1) {
    try {
      return await sendEmail(message);
    } catch (error) {
      lastError = error;
      if (error instanceof EmailConfigurationRequiredError || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new EmailDeliveryError();
}
