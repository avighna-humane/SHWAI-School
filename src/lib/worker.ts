import type { requireDatabase } from "./db.ts";
import { sendEmail } from "./notifications/email.ts";
import { PermanentJobError, claimJobs, completeJob, failJob, type JobRow } from "./jobs.ts";
import { StorageConfigurationError, putPrivateObject, storageProviderState } from "./storage.ts";

type SqlClient = ReturnType<typeof requireDatabase>;

type ExportRow = Record<string, unknown>;

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: ExportRow[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
}

async function processCleanup(sql: SqlClient) {
  await sql`DELETE FROM hw_email_verification_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'`;
  await sql`DELETE FROM hw_password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'`;
  await sql`DELETE FROM hw_sessions WHERE expires_at < NOW() OR last_seen_at < NOW() - INTERVAL '2 hours'`;
  await sql`DELETE FROM hw_security_rate_limits WHERE expires_at < NOW()`;
  if (storageProviderState().status === "configured") {
    const expiredObjects = await sql<{ id: string; storage_key: string }[]>`
      SELECT id, storage_key FROM hw_storage_objects
      WHERE status = 'active' AND (expires_at IS NOT NULL AND expires_at < NOW())`;
    for (const object of expiredObjects) {
      try {
        const { deletePrivateObject } = await import("./storage.ts");
        await deletePrivateObject(object.storage_key);
        await sql`UPDATE hw_storage_objects SET status = 'expired', deleted_at = NOW() WHERE id = ${object.id} AND status = 'active'`;
      } catch {
        // Keep the object active until provider deletion succeeds.
      }
    }
  }
  return { cleanup: true };
}

async function processExport(sql: SqlClient, job: JobRow) {
  const exportJobId = String(job.payload.exportJobId ?? "");
  if (!exportJobId) throw new PermanentJobError("Export job payload is missing exportJobId");
  const exportJobs = await sql<
    { id: string; school_id: string; export_type: string; format: "csv" | "json"; status: string }[]
  >`
    SELECT id, school_id, export_type, format, status FROM hw_export_jobs
    WHERE id = ${exportJobId} AND school_id = ${job.school_id} AND status IN ('queued','running')`;
  const exportJob = exportJobs[0];
  if (!exportJob) throw new PermanentJobError("Export job is missing or already completed");

  let rows: ExportRow[];
  if (exportJob.export_type === "students") {
    rows = await sql<ExportRow[]>`
      SELECT id, admission_no, name, dob, gender, guardian_name, guardian_phone, status, created_at
      FROM hw_students WHERE school_id = ${exportJob.school_id} ORDER BY name LIMIT 50000`;
  } else if (exportJob.export_type === "attendance") {
    rows = await sql<ExportRow[]>`
      SELECT student_id, student_name, class_id, date AS attendance_date, status, marked_by, marked_at, synced
      FROM hw_attendance WHERE school_id = ${exportJob.school_id} ORDER BY date DESC LIMIT 50000`;
  } else if (exportJob.export_type === "grades") {
    rows = await sql<ExportRow[]>`
      SELECT student_id, subject, assessment_id, homework_id, obtained_marks, maximum_marks, percentage, grade, feedback, publication_status, created_at
      FROM hw_grades WHERE school_id = ${exportJob.school_id} ORDER BY created_at DESC LIMIT 50000`;
  } else {
    throw new PermanentJobError("Export type is not supported");
  }

  const content = exportJob.format === "json" ? JSON.stringify(rows) : toCsv(rows);
  const fileName = `shwai-${exportJob.export_type}-${new Date().toISOString().slice(0, 10)}.${exportJob.format}`;
  const mimeType = exportJob.format === "json" ? "application/json" : "text/csv";
  const key = `${exportJob.school_id}/private/exports/${exportJob.id}.${exportJob.format}`;
  let uploaded;
  try {
    uploaded = await putPrivateObject({ key, content, contentType: mimeType });
  } catch (error) {
    if (error instanceof StorageConfigurationError) throw new PermanentJobError(error.message);
    throw error;
  }
  const storageRows = await sql<{ id: string }[]>`
    INSERT INTO hw_storage_objects
      (school_id, storage_key, original_name, mime_type, size_bytes, checksum_sha256, scan_status, status, created_by, expires_at)
    VALUES
      (${exportJob.school_id}, ${uploaded.key}, ${fileName}, ${mimeType}, ${uploaded.sizeBytes}, ${uploaded.checksumSha256}, 'clean', 'active', ${String(job.payload.createdBy ?? "worker")}, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (school_id, storage_key) DO UPDATE SET
      original_name = EXCLUDED.original_name, mime_type = EXCLUDED.mime_type, size_bytes = EXCLUDED.size_bytes,
      checksum_sha256 = EXCLUDED.checksum_sha256, scan_status = 'clean', status = 'active', expires_at = EXCLUDED.expires_at,
      deleted_at = NULL
    RETURNING id`;
  await sql`
    UPDATE hw_export_jobs
    SET status = 'succeeded', artifact_reference = ${`storage:${storageRows[0]!.id}`}, completed_at = NOW(), expires_at = NOW() + INTERVAL '15 minutes', failure_reason = ''
    WHERE id = ${exportJob.id} AND school_id = ${exportJob.school_id}`;
  return {
    exportJobId: exportJob.id,
    storageObjectId: storageRows[0]!.id,
    fileName,
    rowCount: rows.length,
  };
}

async function processEmail(sql: SqlClient, job: JobRow) {
  const deliveryId = String(job.payload.deliveryId ?? "");
  const rows = await sql<{ id: string; recipient_email: string; subject: string; body: string }[]>`
    SELECT d.id, u.email AS recipient_email, COALESCE(n.title, d.template) AS subject, COALESCE(n.body, d.template) AS body
    FROM hw_notification_deliveries d
    JOIN hw_users u ON u.id = d.recipient_id
    LEFT JOIN hw_notifications n ON n.id = d.notification_id AND n.school_id = d.school_id
    WHERE d.school_id = ${job.school_id}
      AND d.channel = 'email'
      AND d.status = 'queued'
      AND (${deliveryId} = '' OR d.id = ${deliveryId})
    ORDER BY d.created_at ASC LIMIT 1`;
  const delivery = rows[0];
  if (!delivery) throw new PermanentJobError("No queued email delivery matches the job");
  await sql`UPDATE hw_notification_deliveries SET status = 'sending', attempts = attempts + 1, updated_at = NOW() WHERE id = ${delivery.id} AND status = 'queued'`;
  await sendEmail({
    to: delivery.recipient_email,
    subject: delivery.subject.slice(0, 200),
    text: delivery.body.slice(0, 10000),
    html: `<p>${delivery.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>")}</p>`,
  });
  await sql`UPDATE hw_notification_deliveries SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = ${delivery.id}`;
  return { deliveryId: delivery.id, delivered: true };
}

async function processJob(sql: SqlClient, job: JobRow) {
  if (job.job_type === "cleanup") return processCleanup(sql);
  if (job.job_type === "export") return processExport(sql, job);
  if (job.job_type === "email") return processEmail(sql, job);
  throw new PermanentJobError(`No processor is configured for ${job.job_type}`);
}

export async function runWorkerBatch(sql: SqlClient, limit = 20) {
  const jobs = await claimJobs(sql, limit);
  const results: Array<{ id: string; status: string; detail?: string }> = [];
  for (const job of jobs) {
    if (job.cancel_requested) {
      results.push({ id: job.id, status: "cancelled" });
      continue;
    }
    try {
      const result = await processJob(sql, job);
      await completeJob(sql, { id: job.id, status: "succeeded", result });
      results.push({ id: job.id, status: "succeeded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job processor failed";
      try {
        const failed = await failJob(sql, {
          id: job.id,
          attempts: job.attempts,
          maxAttempts: job.max_attempts,
          failureReason: message,
          permanent: error instanceof PermanentJobError,
        });
        results.push({ id: job.id, status: failed.status, detail: message });
      } catch {
        results.push({ id: job.id, status: "failed_unrecorded" });
      }
    }
  }
  return { claimed: jobs.length, results };
}
