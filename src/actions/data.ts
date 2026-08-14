import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { consumeSecurityRateLimit } from "@/lib/security";

const exportSchema = z.object({
  exportType: z.enum(["students", "attendance", "grades"]),
  format: z.enum(["csv", "json"]),
});

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
}

export const exportSchoolData = createServerFn({ method: "POST" })
  .validator(exportSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.export");
    const sql = requireDatabase();
    await consumeSecurityRateLimit(sql, {
      scope: "export_school_user",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    const jobRows = await sql<{ id: string }[]>`
      INSERT INTO hw_export_jobs (school_id, export_type, format, status, scope, initiated_by, expires_at)
      VALUES (${context.schoolId}, ${data.exportType}, ${data.format}, 'running', ${JSON.stringify({ bounded: true, limit: 5000 })}::JSONB, ${context.userId}, NOW() + INTERVAL '15 minutes') RETURNING id`;
    const jobId = jobRows[0]!.id;
    let rows: Record<string, unknown>[];
    if (data.exportType === "students") {
      rows = await sql<
        Record<string, unknown>[]
      >`SELECT id, admission_no, name, dob, gender, guardian_name, guardian_phone, status, created_at FROM hw_students WHERE school_id = ${context.schoolId} ORDER BY name LIMIT 5000`;
    } else if (data.exportType === "attendance") {
      rows = await sql<
        Record<string, unknown>[]
      >`SELECT student_id, student_name, class_id, date AS attendance_date, status, marked_by, marked_at, synced FROM hw_attendance WHERE school_id = ${context.schoolId} ORDER BY date DESC LIMIT 5000`;
    } else {
      rows = await sql<
        Record<string, unknown>[]
      >`SELECT student_id, subject, assessment_id, homework_id, obtained_marks, maximum_marks, percentage, grade, feedback, publication_status, created_at FROM hw_grades WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 5000`;
    }
    const content = data.format === "json" ? JSON.stringify(rows) : toCsv(rows);
    await sql`UPDATE hw_export_jobs SET status = 'succeeded', artifact_reference = ${`inline:${jobId}`}, completed_at = NOW() WHERE id = ${jobId} AND school_id = ${context.schoolId}`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'export', 'data_export', ${jobId}, ${`Exported ${rows.length} ${data.exportType} rows as ${data.format}; bounded inline artifact`})`;
    return {
      jobId,
      fileName: `shwai-${data.exportType}-${new Date().toISOString().slice(0, 10)}.${data.format}`,
      content,
      rowCount: rows.length,
      expiresInSeconds: 900,
    };
  });

export const requestSchoolDeletion = createServerFn({ method: "POST" })
  .validator(
    z.object({
      reason: z.string().trim().min(20).max(2000),
      scope: z.record(z.unknown()).default({}),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.delete");
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_data_requests (school_id, requester_id, request_type, scope, reason)
      VALUES (${context.schoolId}, ${context.userId}, 'deletion', ${JSON.stringify(data.scope)}::JSONB, ${data.reason}) RETURNING id`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'data_deletion_request', ${rows[0]!.id}, 'Destructive school-level deletion requested; execution requires deployment/legal review')`;
    return { id: rows[0]!.id, status: "requested" as const };
  });

export const listSchoolDataRequests = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "audit.read");
  const sql = requireDatabase();
  return sql`SELECT id, requester_id, request_type, scope, status, reviewed_by, reason, created_at, updated_at FROM hw_data_requests WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 100`;
});

export const reviewSchoolDataRequest = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.delete");
    const sql = requireDatabase();
    const rows = await sql<{ id: string; request_type: string }[]>`
      UPDATE hw_data_requests SET status = ${data.decision}, reviewed_by = ${context.userId}, updated_at = NOW()
      WHERE id = ${data.id} AND school_id = ${context.schoolId} AND status = 'requested' RETURNING id, request_type`;
    if (!rows[0]) throw new Error("Data request not found or already reviewed");
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'data_request', ${data.id}, ${`Data ${rows[0].request_type} request ${data.decision}; destructive execution remains a controlled deployment job`})`;
    return { ok: true as const, status: data.decision };
  });
