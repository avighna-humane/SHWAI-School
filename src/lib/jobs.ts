import type { requireDatabase } from "./db.ts";

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

export type JobRow = {
  id: string;
  school_id: string | null;
  job_type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  cancel_requested: boolean;
};

export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

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
  const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 3, 10));
  const rows = await sql<{ id: string; status: string }[]>`
    INSERT INTO hw_jobs (school_id, job_type, idempotency_key, payload, max_attempts, created_by)
    VALUES (${input.schoolId ?? null}, ${input.jobType}, ${input.idempotencyKey}, ${JSON.stringify(payload)}::JSONB, ${maxAttempts}, ${input.createdBy ?? null})
    ON CONFLICT (school_id, job_type, idempotency_key) DO UPDATE SET updated_at = NOW()
    RETURNING id, status`;
  return rows[0]!;
}

export async function recoverExpiredLeases(sql: SqlClient) {
  const deadLettered = await sql<{ id: string }[]>`
    UPDATE hw_jobs
    SET status = 'dead_letter', dead_lettered_at = NOW(), completed_at = NOW(),
        failure_reason = 'Worker lease expired after maximum attempts', updated_at = NOW()
    WHERE status = 'running' AND lease_until < NOW() AND attempts >= max_attempts
    RETURNING id`;
  const requeued = await sql<{ id: string }[]>`
    UPDATE hw_jobs
    SET status = 'queued', available_at = NOW(), lease_until = NULL,
        failure_reason = 'Worker lease expired; queued for retry', updated_at = NOW()
    WHERE status = 'running' AND lease_until < NOW() AND attempts < max_attempts AND cancel_requested = FALSE
    RETURNING id`;
  await sql`
    UPDATE hw_jobs
    SET status = 'cancelled', completed_at = NOW(), lease_until = NULL,
        failure_reason = 'Cancelled before worker retry', updated_at = NOW()
    WHERE status IN ('queued','running') AND cancel_requested = TRUE`;
  return { deadLettered: deadLettered.length, requeued: requeued.length };
}

export async function claimJobs(sql: SqlClient, limit = 20) {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  await recoverExpiredLeases(sql);
  return sql<JobRow[]>`
    WITH claimed AS (
      SELECT id FROM hw_jobs
      WHERE status = 'queued' AND available_at <= NOW() AND attempts < max_attempts AND cancel_requested = FALSE
      ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT ${boundedLimit}
    )
    UPDATE hw_jobs j SET status = 'running', attempts = j.attempts + 1,
      started_at = NOW(), lease_until = NOW() + INTERVAL '5 minutes', updated_at = NOW()
    FROM claimed WHERE j.id = claimed.id
    RETURNING j.id, j.school_id, j.job_type, j.payload, j.attempts, j.max_attempts, j.cancel_requested`;
}

export async function completeJob(
  sql: SqlClient,
  input: {
    id: string;
    status: "succeeded" | "cancelled";
    result?: Record<string, unknown>;
    failureReason?: string;
  },
) {
  const rows = await sql<{ id: string; status: string }[]>`
    UPDATE hw_jobs SET status = ${input.status}, result = ${JSON.stringify(input.result ?? {})}::JSONB,
      failure_reason = ${input.failureReason ?? ""}, lease_until = NULL, completed_at = NOW(), updated_at = NOW()
    WHERE id = ${input.id} AND status = 'running' RETURNING id, status`;
  if (!rows[0]) throw new Error("Job is not running or does not exist");
  return rows[0];
}

export async function failJob(
  sql: SqlClient,
  input: {
    id: string;
    attempts: number;
    maxAttempts: number;
    failureReason: string;
    permanent?: boolean;
  },
) {
  const deadLetter = input.permanent || input.attempts >= input.maxAttempts;
  const retryDelaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, input.attempts - 1));
  const rows = await sql<{ id: string; status: string }[]>`
    UPDATE hw_jobs
    SET status = ${deadLetter ? "dead_letter" : "queued"},
        failure_reason = ${input.failureReason.slice(0, 1000)},
        available_at = NOW() + (${deadLetter ? 0 : retryDelaySeconds} * INTERVAL '1 second'),
        lease_until = NULL,
        dead_lettered_at = ${deadLetter ? sql`NOW()` : sql`NULL`},
        completed_at = ${deadLetter ? sql`NOW()` : sql`NULL`},
        updated_at = NOW()
    WHERE id = ${input.id} AND status = 'running'
    RETURNING id, status`;
  if (!rows[0]) throw new Error("Job is not running or does not exist");
  return { ...rows[0], retryDelaySeconds: deadLetter ? 0 : retryDelaySeconds };
}

export async function cancelJob(sql: SqlClient, id: string) {
  const rows = await sql<{ id: string; status: string }[]>`
    UPDATE hw_jobs
    SET cancel_requested = TRUE, updated_at = NOW()
    WHERE id = ${id} AND status IN ('queued','running')
    RETURNING id, status`;
  return rows[0] ?? null;
}
