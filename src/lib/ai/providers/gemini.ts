import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { aiEnv } from "../env";
import type { AIGenerateRequest, ProviderAdapter } from "./types";

function toGenerateTextInput(request: AIGenerateRequest) {
  return {
    system: request.system,
    temperature: request.temperature,
    maxOutputTokens: request.maxOutputTokens,
    ...(request.messages ? { messages: request.messages } : { prompt: request.prompt ?? "" }),
  };
}

/** Direct Gemini Developer API access (Google AI Studio API keys), independent of Firebase. */
export const geminiProvider: ProviderAdapter = {
  name: "gemini",
  isConfigured() {
    return aiEnv.gemini.keys.length > 0;
  },
  getKeys() {
    return aiEnv.gemini.keys;
  },
  getModel() {
    return aiEnv.gemini.model;
  },
  async generateWithKey(apiKey, request) {
    const google = createGoogleGenerativeAI({ apiKey });
    const { text } = await generateText({
      model: google(aiEnv.gemini.model),
      ...toGenerateTextInput(request),
    });
    return { text };
  },
};
