import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requireFeatureEntitlement, requirePermission } from "@/lib/permissions";
import { consumeSecurityRateLimit } from "@/lib/security";
import { enqueueJob } from "@/lib/jobs";
import { presignPrivateObject } from "@/lib/storage";

const exportSchema = z.object({
  exportType: z.enum(["students", "attendance", "grades"]),
  format: z.enum(["csv", "json"]),
});

const exportJobSchema = z.object({ id: z.string().uuid() });

type ExportJob = {
  id: string;
  school_id: string;
  export_type: string;
  format: "csv" | "json";
  status: string;
  artifact_reference: string;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  failure_reason: string;
};

export const exportSchoolData = createServerFn({ method: "POST" })
  .validator(exportSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.export");
    requireFeatureEntitlement(context, "data_export");
    const sql = requireDatabase();
    await consumeSecurityRateLimit(sql, {
      scope: "export_school_user",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    const jobRows = await sql<{ id: string }[]>`
      INSERT INTO hw_export_jobs (school_id, export_type, format, status, scope, initiated_by, expires_at)
      VALUES (${context.schoolId}, ${data.exportType}, ${data.format}, 'queued', ${JSON.stringify({ bounded: true, limit: 50000 })}::JSONB, ${context.userId}, NOW() + INTERVAL '15 minutes')
      RETURNING id`;
    const jobId = jobRows[0]!.id;
    await enqueueJob(sql, {
      schoolId: context.schoolId,
      jobType: "export",
      idempotencyKey: `export:${jobId}`,
      payload: { exportJobId: jobId, createdBy: context.userId },
      createdBy: context.userId,
      maxAttempts: 3,
    });
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'export_queued', 'data_export', ${jobId}, ${`Queued a private ${data.exportType} ${data.format} export; artifact expires in 15 minutes`})`;
    return {
      jobId,
      status: "queued" as const,
      fileName: `shwai-${data.exportType}-${new Date().toISOString().slice(0, 10)}.${data.format}`,
      expiresInSeconds: 900,
    };
  });

export const getExportStatus = createServerFn({ method: "POST" })
  .validator(exportJobSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.export");
    requireFeatureEntitlement(context, "data_export");
    const sql = requireDatabase();
    const rows = await sql<ExportJob[]>`
      SELECT id, school_id, export_type, format, status, artifact_reference, created_at, expires_at, completed_at, failure_reason
      FROM hw_export_jobs WHERE id = ${data.id} AND school_id = ${context.schoolId}`;
    const job = rows[0];
    if (!job) throw new Error("Export job not found");
    return {
      id: job.id,
      status: job.status,
      exportType: job.export_type,
      format: job.format,
      createdAt: job.created_at,
      expiresAt: job.expires_at,
      completedAt: job.completed_at,
      failureReason: job.failure_reason,
      downloadable: job.status === "succeeded" && job.artifact_reference.startsWith("storage:"),
    };
  });

export const downloadExport = createServerFn({ method: "POST" })
  .validator(exportJobSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.export");
    requireFeatureEntitlement(context, "data_export");
    const sql = requireDatabase();
    const rows = await sql<
      (ExportJob & {
        storage_key: string;
        original_name: string;
        scan_status: string;
        storage_status: string;
      })[]
    >`
      SELECT e.id, e.school_id, e.export_type, e.format, e.status, e.artifact_reference, e.created_at, e.expires_at, e.completed_at, e.failure_reason,
             o.storage_key, o.original_name, o.scan_status, o.status AS storage_status
      FROM hw_export_jobs e
      JOIN hw_storage_objects o ON o.id::TEXT = REPLACE(e.artifact_reference, 'storage:', '')
      WHERE e.id = ${data.id} AND e.school_id = ${context.schoolId}`;
    const job = rows[0];
    if (!job || job.status !== "succeeded") throw new Error("Export is not ready");
    if (!job.expires_at || new Date(job.expires_at).getTime() <= Date.now()) {
      await sql`UPDATE hw_export_jobs SET status = 'expired' WHERE id = ${job.id} AND school_id = ${context.schoolId}`;
      throw new Error("Export has expired");
    }
    if (job.scan_status !== "clean" || job.storage_status !== "active")
      throw new Error("Export artifact is unavailable");
    const signed = presignPrivateObject({
      operation: "GET",
      key: job.storage_key,
      expiresInSeconds: 600,
    });
    await sql`
      INSERT INTO hw_data_access_logs (school_id, actor_id, actor_role, action, entity, entity_id, fields, reason)
      VALUES (${context.schoolId}, ${context.userId}, ${context.role}, 'download', 'data_export', ${job.id}, ARRAY['private_artifact'], 'Authenticated school-scoped export download')`;
    return {
      url: signed.url,
      fileName: job.original_name,
      expiresInSeconds: signed.expiresInSeconds,
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
