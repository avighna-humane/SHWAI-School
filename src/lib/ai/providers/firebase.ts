import { deleteApp, getApps, initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, type Content } from "firebase/ai";
import { aiEnv } from "../env";
import type { AIGenerateRequest, ProviderAdapter } from "./types";

/**
 * Firebase AI Logic (https://firebase.google.com/docs/ai-logic), using the Gemini
 * Developer API backend. This is intentionally a real Firebase integration — not a
 * generic "Firebase LLM" fiction — so it goes through `firebase/app` + `firebase/ai`
 * rather than the AI SDK, which has no Firebase AI Logic provider.
 *
 * Each rotated API key needs its own named Firebase app instance, since a
 * FirebaseApp's credentials are fixed at initialization time.
 */

function toContents(request: AIGenerateRequest): Content[] {
  if (request.messages) {
    return request.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          {
            text:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          },
        ],
      }));
  }
  return [{ role: "user", parts: [{ text: request.prompt ?? "" }] }];
}

function getAppForKey(apiKey: string) {
  const appName = `shwai-ai-firebase-${apiKey.slice(-8)}`;
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
  return initializeApp(
    {
      apiKey,
      projectId: aiEnv.firebase.projectId,
      appId: aiEnv.firebase.appId,
      authDomain: aiEnv.firebase.authDomain || undefined,
    },
    appName,
  );
}

export const firebaseProvider: ProviderAdapter = {
  name: "firebase",
  isConfigured() {
    const env = aiEnv.firebase;
    return env.keys.length > 0 && env.projectId.length > 0 && env.appId.length > 0;
  },
  getKeys() {
    return aiEnv.firebase.keys;
  },
  getModel() {
    return aiEnv.firebase.model;
  },
  async generateWithKey(apiKey, request) {
    const app = getAppForKey(apiKey);
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: aiEnv.firebase.model,
        ...(request.system ? { systemInstruction: request.system } : {}),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
        },
      });
      const result = await model.generateContent({ contents: toContents(request) });
      return { text: result.response.text() };
    } finally {
      // Firebase apps are cheap in-memory handles, but there's no reason to keep
      // dozens of them alive across the process lifetime — drop it after use.
      await deleteApp(app).catch(() => {});
    }
  },
};
