import { requireDatabase } from "@/lib/db";

export async function getReadinessResponse() {
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
}
