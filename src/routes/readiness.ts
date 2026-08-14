import { createFileRoute } from "@tanstack/react-router";
import { requireDatabase } from "@/lib/db";

export const Route = createFileRoute("/readiness")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sql = requireDatabase();
          await sql`SELECT 1`;
          return Response.json({ status: "ready", dependencies: { database: "ready" } });
        } catch {
          return Response.json(
            { status: "not_ready", dependencies: { database: "not_ready" } },
            { status: 503 },
          );
        }
      },
    },
  },
});
