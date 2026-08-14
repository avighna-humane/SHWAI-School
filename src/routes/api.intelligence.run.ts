import { createFileRoute } from "@tanstack/react-router";
import { executeAutomationRulesForSchool, executeIntelligenceScan } from "@/actions/intelligence";
import { requireDatabase } from "@/lib/db";
import type { AuthContext } from "@/lib/auth";

export const Route = createFileRoute("/api/intelligence/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const configuredSecret = process.env.SHWAI_INTELLIGENCE_CRON_SECRET;
        if (!configuredSecret)
          return Response.json(
            { error: "Scheduled intelligence is not configured" },
            { status: 503 },
          );
        if (request.headers.get("x-shwai-intelligence-secret") !== configuredSecret)
          return Response.json(
            { error: "Unauthorized scheduled intelligence request" },
            { status: 401 },
          );
        const sql = requireDatabase();
        const schools = await sql<{ id: string; name: string }[]>`
          SELECT id, name FROM hw_schools WHERE active = TRUE ORDER BY id`;
        const results: Array<{
          schoolId: string;
          status: string;
          signalsCreated?: number;
          alertsCreated?: number;
          error?: string;
          automationRuns?: number;
        }> = [];
        for (const school of schools) {
          const systemContext: AuthContext = {
            userId: "system:intelligence-scheduler",
            email: "system@shwai.invalid",
            name: "SHWAI Intelligence Scheduler",
            schoolId: school.id,
            schoolName: school.name,
            role: "owner",
            membershipId: "system-scheduler",
          };
          try {
            const result = await executeIntelligenceScan(systemContext, { windowDays: 30 });
            const automations = await executeAutomationRulesForSchool(systemContext);
            results.push({
              schoolId: school.id,
              status: result.status,
              signalsCreated: result.signalsCreated,
              alertsCreated: result.alertsCreated,
              automationRuns: automations.length,
            });
          } catch (error) {
            results.push({
              schoolId: school.id,
              status: "failed",
              error: error instanceof Error ? error.message : "Intelligence scan failed",
            });
          }
        }
        return Response.json({ status: "completed", schoolsProcessed: schools.length, results });
      },
    },
  },
});
