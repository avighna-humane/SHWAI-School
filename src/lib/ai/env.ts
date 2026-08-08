/**
 * Central place that reads AI provider configuration from environment variables.
 *
 * All values are read lazily (as getters) rather than cached at import time, so tests
 * and future callers can mutate `process.env` and see the change without a restart.
 * Every key list may legitimately be empty — that just means the provider is unconfigured
 * and the router will skip it.
 */

function parseKeyList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

function readTrimmed(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export const aiEnv = {
  groq: {
    get keys() {
      return parseKeyList(process.env.GROQ_API_KEYS);
    },
    get model() {
      return readTrimmed("GROQ_MODEL") || "llama-3.3-70b-versatile";
    },
  },
  firebase: {
    get keys() {
      return parseKeyList(process.env.FIREBASE_API_KEYS);
    },
    get projectId() {
      return readTrimmed("FIREBASE_PROJECT_ID");
    },
    get appId() {
      return readTrimmed("FIREBASE_APP_ID");
    },
    get authDomain() {
      return readTrimmed("FIREBASE_AUTH_DOMAIN");
    },
    get model() {
      return readTrimmed("FIREBASE_MODEL") || "gemini-flash-latest";
    },
  },
  gemini: {
    get keys() {
      return parseKeyList(process.env.GEMINI_API_KEYS);
    },
    get model() {
      return readTrimmed("GEMINI_MODEL") || "gemini-flash-latest";
    },
  },
  cerebras: {
    get keys() {
      return parseKeyList(process.env.CEREBRAS_API_KEYS);
    },
    get model() {
      return readTrimmed("CEREBRAS_MODEL") || "gpt-oss-120b";
    },
  },
};
