import { createGroq } from "@ai-sdk/groq";
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

export const groqProvider: ProviderAdapter = {
  name: "groq",
  isConfigured() {
    return aiEnv.groq.keys.length > 0;
  },
  getKeys() {
    return aiEnv.groq.keys;
  },
  getModel() {
    return aiEnv.groq.model;
  },
  async generateWithKey(apiKey, request) {
    const groq = createGroq({ apiKey });
    const { text } = await generateText({
      model: groq(aiEnv.groq.model),
      ...toGenerateTextInput(request),
    });
    return { text };
  },
};
