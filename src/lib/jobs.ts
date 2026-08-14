import type { requireDatabase } from "@/lib/db";

type SqlClient = ReturnType<typeof requireDatabase>;

export type JobType =
  | "import"
  | "export"
  | "email"
  | "sms"
  | "whatsapp"
  | "ai"
  | "intelligence"
  | "cleanup"
  | "notification";

export async function enqueueJob(
  sql: SqlClient,
  input: {
    schoolId?: string | null;
    jobType: JobType;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
    createdBy?: string | null;
    maxAttempts?: number;
  },
) {
  if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 240)
    throw new Error("Invalid job idempotency key");
  const payload = input.payload ?? {};
  if (JSON.stringify(payload).length > 100_000) throw new Error("Job payload is too large");
  const rows = await sql<{ id: string; status: string }[]>`
    INSERT INTO hw_jobs (school_id, job_type, idempotency_key, payload, max_attempts, created_by)
    VALUES (${input.schoolId ?? null}, ${input.jobType}, ${input.idempotencyKey}, ${JSON.stringify(payload)}::JSONB, ${input.maxAttempts ?? 3}, ${input.createdBy ?? null})
    ON CONFLICT (school_id, job_type, idempotency_key) DO UPDATE SET updated_at = NOW()
    RETURNING id, status`;
  return rows[0]!;
}

export async function claimJobs(sql: SqlClient, limit = 20) {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  return sql<
    {
      id: string;
      school_id: string | null;
      job_type: JobType;
      payload: Record<string, unknown>;
      attempts: number;
      max_attempts: number;
    }[]
  >`
    WITH claimed AS (
      SELECT id FROM hw_jobs
      WHERE status = 'queued' AND available_at <= NOW() AND attempts < max_attempts
      ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT ${boundedLimit}
    )
    UPDATE hw_jobs j SET status = 'running', attempts = j.attempts + 1, started_at = NOW(), updated_at = NOW()
    FROM claimed WHERE j.id = claimed.id
    RETURNING j.id, j.school_id, j.job_type, j.payload, j.attempts, j.max_attempts`;
}

export async function completeJob(
  sql: SqlClient,
  input: {
    id: string;
    status: "succeeded" | "failed" | "cancelled";
    result?: Record<string, unknown>;
    failureReason?: string;
  },
) {
  const rows = await sql<{ id: string; status: string }[]>`
    UPDATE hw_jobs SET status = ${input.status}, result = ${JSON.stringify(input.result ?? {})}::JSONB,
      failure_reason = ${input.failureReason ?? ""}, completed_at = NOW(), updated_at = NOW()
    WHERE id = ${input.id} AND status = 'running' RETURNING id, status`;
  if (!rows[0]) throw new Error("Job is not running or does not exist");
  return rows[0];
}
