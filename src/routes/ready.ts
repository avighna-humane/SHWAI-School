import { createFileRoute } from "@tanstack/react-router";
import { getReadinessResponse } from "@/lib/readiness";

export const Route = createFileRoute("/ready")({
  server: {
    handlers: {
      GET: getReadinessResponse,
    },
  },
});
