import { AIAllProvidersFailedError, AINoProvidersConfiguredError, classifyError, type AIAttemptFailure } from "./errors";
import { getRotator, maskKey } from "./key-rotation";
import { cerebrasProvider } from "./providers/cerebras";
import { firebaseProvider } from "./providers/firebase";
import { geminiProvider } from "./providers/gemini";
import { groqProvider } from "./providers/groq";
import type { AIGenerateRequest, AIGenerateResult, ProviderAdapter } from "./providers/types";

/**
 * Fixed priority order requested for SHWAI's AI intelligence layer:
 * Groq → Firebase → Gemini → Cerebras.
 *
 * This is the ONLY place provider priority is defined. To add, remove, or reorder a
 * provider, edit this array (and add a matching adapter under ./providers) — nothing
 * else in the app needs to change.
 */
const PROVIDERS: ProviderAdapter[] = [groqProvider, firebaseProvider, geminiProvider, cerebrasProvider];

/**
 * Single entry point for all AI text generation in SHWAI. Every feature that needs
 * an AI response should call `ai.generate(...)` — never a provider SDK directly —
 * so provider selection, key rotation, and fallback stay centralized here.
 *
 * Behavior:
 * - Tries providers in priority order, skipping any with no configured API keys.
 * - Within a provider, rotates through its keys round-robin, skipping keys on cooldown.
 * - Rate-limit / auth / server / network errors put that key on a cooldown and move to
 *   the next key (then the next provider once the pool is exhausted).
 * - Invalid-request errors are not retried with another key of the same provider,
 *   since the request itself is the problem — the router moves straight to the
 *   next provider instead.
 * - If every configured provider/key fails, throws `AIAllProvidersFailedError`.
 * - If nothing is configured at all, throws `AINoProvidersConfiguredError`.
 */
export async function generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
  const configuredProviders = PROVIDERS.filter((provider) => provider.isConfigured());
  if (configuredProviders.length === 0) {
    throw new AINoProvidersConfiguredError();
  }

  const attempts: AIAttemptFailure[] = [];

  for (const provider of configuredProviders) {
    const keys = provider.getKeys();
    const rotator = getRotator(provider.name, keys);

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const apiKey = rotator.next();
      if (apiKey === null) {
        // Every key for this provider is currently on cooldown — move to the next provider.
        break;
      }

      try {
        const { text } = await provider.generateWithKey(apiKey, request);
        rotator.markSuccess(apiKey);
        return { text, provider: provider.name, model: provider.getModel() };
      } catch (error) {
        const classified = classifyError(error);
        attempts.push({ provider: provider.name, type: classified.type, message: classified.message });

        if (!classified.retryNextKey) {
          // The request itself is the problem (bad params, unsupported input, etc.) —
          // retrying with another key of the same provider would fail identically.
          console.error(
            `[v0] AI provider "${provider.name}" rejected the request (key ${maskKey(apiKey)}): ${classified.message}`,
          );
          break;
        }

        rotator.markFailure(apiKey, classified.cooldownMs);
        console.error(
          `[v0] AI provider "${provider.name}" key ${maskKey(apiKey)} failed (${classified.type}): ${classified.message}`,
        );
      }
    }
  }

  throw new AIAllProvidersFailedError(attempts);
}

export const ai = { generate };
