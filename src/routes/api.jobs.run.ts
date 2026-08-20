import { createFileRoute } from "@tanstack/react-router";
import { requireDatabase } from "@/lib/db";
import {
  consumeSecurityRateLimit,
  constantTimeEqual,
  hashIdentifier,
  recordSecurityEvent,
} from "@/lib/security";
import { runWorkerBatch } from "@/lib/worker";

export const Route = createFileRoute("/api/jobs/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const configuredSecret = process.env.SHWAI_JOB_RUNNER_SECRET;
        if (!configuredSecret)
          return Response.json({ error: "Job runner is not configured" }, { status: 503 });
        const suppliedSecret = request.headers.get("x-shwai-job-secret") ?? "";
        if (
          !constantTimeEqual(
            new TextEncoder().encode(suppliedSecret),
            new TextEncoder().encode(configuredSecret),
          )
        )
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        const sql = requireDatabase();
        const source =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        await consumeSecurityRateLimit(sql, {
          scope: "job_runner_ip",
          subject: await hashIdentifier(source),
          limit: 30,
          windowSeconds: 60,
        });
        const result = await runWorkerBatch(sql, 20);
        await recordSecurityEvent(sql, {
          eventType: "job_runner",
          outcome: "allowed",
          severity: "info",
          requestId: request.headers.get("x-request-id") ?? undefined,
          resource: "/api/jobs/run",
          detail: { claimed: result.claimed, resultCount: result.results.length },
        });
        return Response.json({ status: "completed", ...result });
      },
    },
  },
});
