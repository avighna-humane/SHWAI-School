import { createCerebras } from "@ai-sdk/cerebras";
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

export const cerebrasProvider: ProviderAdapter = {
  name: "cerebras",
  isConfigured() {
    return aiEnv.cerebras.keys.length > 0;
  },
  getKeys() {
    return aiEnv.cerebras.keys;
  },
  getModel() {
    return aiEnv.cerebras.model;
  },
  async generateWithKey(apiKey, request) {
    const cerebras = createCerebras({ apiKey });
    const { text } = await generateText({
      model: cerebras(aiEnv.cerebras.model),
      ...toGenerateTextInput(request),
    });
    return { text };
  },
};
