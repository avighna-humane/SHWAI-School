import { getGlobalStartContext } from "@tanstack/react-start";
import type { AuthContext } from "@/lib/auth";
import type { requireDatabase } from "@/lib/db";

type SqlClient = ReturnType<typeof requireDatabase>;

type RequestSecurityContext = {
  requestId?: string;
  origin?: string | null;
  ipHash?: string;
};

export type SecurityEventInput = {
  eventType: string;
  outcome: "allowed" | "denied" | "blocked" | "failed" | "observed";
  severity?: "info" | "warning" | "high" | "critical";
  context?: Partial<AuthContext> | null;
  requestId?: string;
  resource?: string;
  detail?: Record<string, unknown>;
};

export class SecurityPolicyError extends Error {
  code: string;
  retryAfterSeconds: number;

  constructor(message: string, code = "SECURITY_POLICY_BLOCKED", retryAfterSeconds = 0) {
    super(message);
    this.name = "SecurityPolicyError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashIdentifier(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export function getRequestSecurityContext(): RequestSecurityContext {
  try {
    const context = getGlobalStartContext() as { security?: RequestSecurityContext } | undefined;
    return context?.security ?? {};
  } catch {
    return {};
  }
}

export function redactSecurityDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) return {};
  const forbidden = /password|secret|token|authorization|cookie|api.?key|connection|file.?data/i;
  return Object.fromEntries(
    Object.entries(detail)
      .filter(([key]) => !forbidden.test(key))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 500) : value]),
  );
}

export async function recordSecurityEvent(sql: SqlClient, event: SecurityEventInput) {
  const security = getRequestSecurityContext();
  await sql`
    INSERT INTO hw_security_events
      (school_id, actor_id, actor_role, event_type, outcome, severity, request_id, resource, detail)
    VALUES
      (${event.context?.schoolId ?? null}, ${event.context?.userId ?? null}, ${event.context?.role ?? null}, ${event.eventType}, ${event.outcome}, ${event.severity ?? "info"}, ${event.requestId ?? security.requestId ?? null}, ${event.resource ?? null}, ${JSON.stringify(redactSecurityDetail(event.detail))}::JSONB)`;
}

export async function consumeSecurityRateLimit(
  sql: SqlClient,
  input: { scope: string; subject: string; limit: number; windowSeconds: number },
) {
  const scope = input.scope.trim().slice(0, 100);
  const subjectHash = await hashIdentifier(input.subject.trim().slice(0, 240));
  const windowMs = input.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const rows = await sql<{ request_count: number }[]>`
    INSERT INTO hw_security_rate_limits
      (scope, subject_hash, window_start, request_count, expires_at)
    VALUES
      (${scope}, ${subjectHash}, ${windowStart.toISOString()}, 1, ${expiresAt.toISOString()})
    ON CONFLICT (scope, subject_hash, window_start)
    DO UPDATE SET request_count = hw_security_rate_limits.request_count + 1, updated_at = NOW()
    RETURNING request_count`;
  const requestCount = Number(rows[0]?.request_count ?? 0);
  if (requestCount > input.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    throw new SecurityPolicyError(
      "Too many requests. Please try again later.",
      "SECURITY_RATE_LIMIT",
      retryAfterSeconds,
    );
  }
  return { requestCount, windowStart, expiresAt };
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left[index % Math.max(1, left.length)] ?? 0) ^
      (right[index % Math.max(1, right.length)] ?? 0);
  }
  return difference === 0;
}

export function safeErrorMessage(error: unknown, fallback = "Request failed. Please retry.") {
  if (error instanceof SecurityPolicyError) return error.message;
  if (error instanceof Error && "code" in error) {
    const code = String((error as Error & { code?: unknown }).code);
    const safeCodes = new Set([
      "AI_CONFIGURATION_REQUIRED",
      "AI_ROLE_FORBIDDEN",
      "AI_SAFETY_BLOCKED",
      "AI_INPUT_TOO_LARGE",
      "AI_RATE_LIMIT",
      "AI_DAILY_LIMIT",
    ]);
    if (safeCodes.has(code)) return error.message.slice(0, 240);
  }
  return fallback;
}

export function validateSafeStorageKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 500 || key.startsWith("/") || key.includes("\\") || key.includes("..")) {
    throw new SecurityPolicyError("Storage key is invalid", "UNSAFE_STORAGE_KEY");
  }
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]{1,12}$/.test(key)) {
    throw new SecurityPolicyError("Storage key is invalid", "UNSAFE_STORAGE_KEY");
  }
  return key;
}

export function validateAttachment(input: {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
}) {
  const fileName = input.fileName.trim();
  const fileType = input.fileType.trim().toLowerCase();
  const hasControlCharacter = [...fileName].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (
    !/^[^\\/]{1,180}$/.test(fileName) ||
    hasControlCharacter ||
    fileName === "." ||
    fileName === ".."
  ) {
    throw new SecurityPolicyError("Attachment filename is invalid", "UNSAFE_ATTACHMENT_NAME");
  }
  const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);
  if (!allowedTypes.has(fileType)) {
    throw new SecurityPolicyError("Attachment type is not allowed", "UNSAFE_ATTACHMENT_TYPE");
  }
  if (!Number.isInteger(input.fileSize) || input.fileSize < 1 || input.fileSize > 5_000_000) {
    throw new SecurityPolicyError("Attachment exceeds the 5 MB limit", "ATTACHMENT_TOO_LARGE");
  }
  if (input.fileData.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.fileData)) {
    throw new SecurityPolicyError("Attachment data is invalid", "UNSAFE_ATTACHMENT_DATA");
  }
  const decodedBytes =
    Math.floor((input.fileData.length * 3) / 4) -
    (input.fileData.endsWith("==") ? 2 : input.fileData.endsWith("=") ? 1 : 0);
  if (decodedBytes !== input.fileSize || decodedBytes > 5_000_000) {
    throw new SecurityPolicyError(
      "Attachment size does not match its data",
      "ATTACHMENT_SIZE_MISMATCH",
    );
  }
  return { fileName, fileType, fileSize: input.fileSize, fileData: input.fileData };
}
