import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          status: "healthy",
          service: "shwai-school",
          version: process.env.APP_VERSION ?? "unknown",
          timestamp: new Date().toISOString(),
        }),
    },
  },
});
