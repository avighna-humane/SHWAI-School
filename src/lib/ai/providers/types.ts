import type { ModelMessage } from "ai";

/** Provider names, in default priority order. */
export type AIProviderName = "groq" | "firebase" | "gemini" | "cerebras";

/** Input accepted by the router and forwarded to whichever provider handles the request. */
export interface AIGenerateRequest {
  /** Simple single-turn prompt. Ignored if `messages` is provided. */
  prompt?: string;
  /** Multi-turn conversation. Takes precedence over `prompt` when provided. */
  messages?: ModelMessage[];
  /** System instructions applied regardless of provider. */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIGenerateResult {
  text: string;
  provider: AIProviderName;
  model: string;
}

/**
 * Unified adapter interface every provider implements. The router never talks to a
 * provider SDK directly — it only calls these methods, so adding/removing providers
 * never requires changes outside this directory.
 */
export interface ProviderAdapter {
  name: AIProviderName;
  /** Whether enough environment configuration exists to attempt requests at all. */
  isConfigured(): boolean;
  /** The rotation pool of API keys currently configured for this provider. */
  getKeys(): string[];
  /** The model identifier this provider will use (for logging/telemetry only). */
  getModel(): string;
  /** Performs one generation attempt using a single, specific API key. */
  generateWithKey(apiKey: string, request: AIGenerateRequest): Promise<{ text: string }>;
}
