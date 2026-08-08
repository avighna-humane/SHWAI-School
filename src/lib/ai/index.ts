/**
 * SHWAI AI intelligence layer.
 *
 * Usage: `import { ai } from "@/lib/ai";` then `await ai.generate({ prompt: "..." })`.
 * This is the ONLY supported way to call an AI provider from application code —
 * see ./router.ts for the fallback/rotation behavior and ./providers for adapters.
 *
 * Server-only: every adapter reads secret API keys from environment variables and
 * calls provider APIs directly, so this module must never be imported from
 * client-side/browser code.
 */
export { ai, generate } from "./router";
export { AIAllProvidersFailedError, AINoProvidersConfiguredError } from "./errors";
export type { AIGenerateRequest, AIGenerateResult, AIProviderName } from "./providers/types";
