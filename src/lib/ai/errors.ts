import { APICallError } from "ai";
import type { AIProviderName } from "./providers/types";

export type AIErrorType = "auth" | "rate_limit" | "server" | "network" | "invalid_request" | "unknown";

export interface ClassifiedError {
  type: AIErrorType;
  /** Whether it's worth trying the next key of the *same* provider. */
  retryNextKey: boolean;
  /** How long (ms) to keep this key out of rotation before trying it again. */
  cooldownMs: number;
  message: string;
}

const NETWORK_ERROR_CODES = new Set(["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED"]);

/**
 * Turns any thrown value from a provider SDK into a normalized decision the router can
 * act on, without needing to know which provider or SDK produced it.
 */
export function classifyError(error: unknown): ClassifiedError {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 401 || status === 403) {
      return { type: "auth", retryNextKey: true, cooldownMs: 10 * 60_000, message: "Authentication failed (invalid, revoked, or unauthorized API key)." };
    }
    if (status === 429) {
      return { type: "rate_limit", retryNextKey: true, cooldownMs: 30_000, message: "Rate limit or quota exceeded." };
    }
    if (status !== undefined && status >= 500) {
      return { type: "server", retryNextKey: true, cooldownMs: 5_000, message: "Provider is temporarily unavailable." };
    }
    if (status !== undefined && status >= 400) {
      return { type: "invalid_request", retryNextKey: false, cooldownMs: 0, message: error.message };
    }
    return {
      type: error.isRetryable ? "server" : "unknown",
      retryNextKey: error.isRetryable,
      cooldownMs: 5_000,
      message: error.message,
    };
  }

  const err = error as { status?: number; statusCode?: number; code?: string; message?: string } | null | undefined;
  const status = err?.status ?? err?.statusCode;

  if (status === 401 || status === 403) {
    return { type: "auth", retryNextKey: true, cooldownMs: 10 * 60_000, message: err?.message ?? "Authentication failed." };
  }
  if (status === 429) {
    return { type: "rate_limit", retryNextKey: true, cooldownMs: 30_000, message: err?.message ?? "Rate limit exceeded." };
  }
  if (status !== undefined && status >= 500) {
    return { type: "server", retryNextKey: true, cooldownMs: 5_000, message: err?.message ?? "Provider is temporarily unavailable." };
  }
  if (status !== undefined && status >= 400) {
    return { type: "invalid_request", retryNextKey: false, cooldownMs: 0, message: err?.message ?? "Invalid request." };
  }

  if (err?.code && NETWORK_ERROR_CODES.has(err.code)) {
    return { type: "network", retryNextKey: true, cooldownMs: 5_000, message: err?.message ?? "Network error." };
  }

  return { type: "unknown", retryNextKey: true, cooldownMs: 5_000, message: err?.message ?? "Unknown error." };
}

export interface AIAttemptFailure {
  provider: AIProviderName;
  type: AIErrorType;
  message: string;
}

/** Thrown when every configured provider/key was exhausted without a successful response. */
export class AIAllProvidersFailedError extends Error {
  readonly attempts: AIAttemptFailure[];

  constructor(attempts: AIAttemptFailure[]) {
    super("All configured AI providers failed to generate a response. Please try again shortly.");
    this.name = "AIAllProvidersFailedError";
    this.attempts = attempts;
  }
}

/** Thrown when no provider has any API keys configured at all. */
export class AINoProvidersConfiguredError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Set at least one of GROQ_API_KEYS, FIREBASE_API_KEYS, GEMINI_API_KEYS, or CEREBRAS_API_KEYS.",
    );
    this.name = "AINoProvidersConfiguredError";
  }
}
