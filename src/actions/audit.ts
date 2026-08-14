import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDatabase } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export interface AuditEventRow {
  id: string;
  school_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
  created_at: string;
}

const input = z.object({
  schoolId: z.string().min(1),
  actorSchoolId: z.string().min(1),
  actorRole: z.enum(["principal", "admin", "owner"]),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listAuditEvents = createServerFn({ method: "POST" })
  .validator(input)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    if (data.schoolId !== context.schoolId || data.actorSchoolId !== context.schoolId)
      throw new Error("Cross-school access denied");
    const sql = requireDatabase();
    return sql<AuditEventRow[]>`
      SELECT id, school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail, created_at
      FROM hw_audit_events
      WHERE school_id = ${context.schoolId}
      ORDER BY created_at DESC
      LIMIT ${data.limit}`;
  });
