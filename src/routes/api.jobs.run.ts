import { createFileRoute } from "@tanstack/react-router";
import { requireDatabase } from "@/lib/db";
import { claimJobs, completeJob } from "@/lib/jobs";
import {
  consumeSecurityRateLimit,
  constantTimeEqual,
  hashIdentifier,
  recordSecurityEvent,
} from "@/lib/security";

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
        const jobs = await claimJobs(sql, 20);
        const results: Array<{ id: string; status: string }> = [];
        for (const job of jobs) {
          try {
            if (job.job_type === "cleanup") {
              await sql`DELETE FROM hw_email_verification_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'`;
              await sql`DELETE FROM hw_password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'`;
              await sql`DELETE FROM hw_sessions WHERE expires_at < NOW()`;
              await sql`DELETE FROM hw_security_rate_limits WHERE expires_at < NOW()`;
              await completeJob(sql, {
                id: job.id,
                status: "succeeded",
                result: { cleanup: true },
              });
              results.push({ id: job.id, status: "succeeded" });
            } else {
              await completeJob(sql, {
                id: job.id,
                status: "failed",
                failureReason: `No processor is configured for ${job.job_type}`,
              });
              results.push({ id: job.id, status: "failed_configuration_required" });
            }
          } catch {
            try {
              await completeJob(sql, {
                id: job.id,
                status: "failed",
                failureReason: "Job processor failed; inspect server logs using the request ID",
              });
            } catch {
              /* preserve original failure boundary */
            }
            results.push({ id: job.id, status: "failed" });
          }
        }
        await recordSecurityEvent(sql, {
          eventType: "job_runner",
          outcome: "allowed",
          severity: "info",
          requestId: request.headers.get("x-request-id") ?? undefined,
          resource: "/api/jobs/run",
          detail: { claimed: jobs.length },
        });
        return Response.json({ status: "completed", claimed: jobs.length, results });
      },
    },
  },
});
