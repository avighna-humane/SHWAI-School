import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, verifyPassword } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import {
  consumeSecurityRateLimit,
  getRequestSecurityContext,
  hashIdentifier,
  recordSecurityEvent,
} from "@/lib/security";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/totp";

const codeInput = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
const passwordInput = z.object({ password: z.string().min(1).max(200) });

function normalizeRecoveryCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase();
}

async function hashedRecoveryCodes(codes: string[]) {
  return Promise.all(codes.map((code) => hashIdentifier(normalizeRecoveryCode(code))));
}

export const getMfaStatus = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  const rows = await sql<
    { enabled: boolean; enrolled_at: string | null; last_verified_at: string | null }[]
  >`
    SELECT enabled, enrolled_at, last_verified_at FROM hw_user_mfa WHERE user_id = ${context.userId} LIMIT 1`;
  return {
    enabled: Boolean(rows[0]?.enabled),
    enrolledAt: rows[0]?.enrolled_at ?? null,
    lastVerifiedAt: rows[0]?.last_verified_at ?? null,
  };
});

export const beginMfaEnrollment = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  await consumeSecurityRateLimit(sql, {
    scope: "mfa_enrollment",
    subject: context.userId,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  const secret = generateTotpSecret();
  const ciphertext = await encryptTotpSecret(secret);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = await hashedRecoveryCodes(recoveryCodes);
  await sql`
    INSERT INTO hw_user_mfa (user_id, secret_ciphertext, recovery_code_hashes, enabled, disabled_at, updated_at)
    VALUES (${context.userId}, ${ciphertext}, ${JSON.stringify(hashes)}::JSONB, FALSE, NULL, NOW())
    ON CONFLICT (user_id) DO UPDATE SET secret_ciphertext = EXCLUDED.secret_ciphertext, recovery_code_hashes = EXCLUDED.recovery_code_hashes, enabled = FALSE, disabled_at = NULL, updated_at = NOW()`;
  await recordSecurityEvent(sql, {
    eventType: "mfa_enrollment_started",
    outcome: "allowed",
    severity: "info",
    requestId: getRequestSecurityContext().requestId,
    context,
    resource: "mfa.begin_enrollment",
  });
  const issuer = "SHWAI School";
  const label = `${issuer}:${context.email}`;
  return {
    secret,
    otpauthUrl: `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`,
    recoveryCodes,
  };
});

export const confirmMfaEnrollment = createServerFn({ method: "POST" })
  .validator(codeInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<{ secret_ciphertext: string }[]>`
      SELECT secret_ciphertext FROM hw_user_mfa WHERE user_id = ${context.userId} AND enabled = FALSE LIMIT 1`;
    if (!rows[0]) throw new Error("Begin MFA enrollment before confirming it");
    const valid = await verifyTotpCode(
      await decryptTotpSecret(rows[0].secret_ciphertext),
      data.code,
    );
    if (!valid) throw new Error("The authenticator code is invalid or expired");
    await sql`
      UPDATE hw_user_mfa SET enabled = TRUE, enrolled_at = NOW(), last_verified_at = NOW(), updated_at = NOW()
      WHERE user_id = ${context.userId}`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'enable', 'mfa', ${context.userId}, 'TOTP MFA enabled')`;
    await recordSecurityEvent(sql, {
      eventType: "mfa_enrollment_confirmed",
      outcome: "allowed",
      severity: "info",
      requestId: getRequestSecurityContext().requestId,
      context,
      resource: "mfa.confirm_enrollment",
    });
    return { ok: true as const };
  });

export const disableMfa = createServerFn({ method: "POST" })
  .validator(passwordInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<{ password_hash: string; enabled: boolean }[]>`
      SELECT u.password_hash, COALESCE(mfa.enabled, FALSE) AS enabled
      FROM hw_users u LEFT JOIN hw_user_mfa mfa ON mfa.user_id = u.id
      WHERE u.id = ${context.userId} LIMIT 1`;
    if (!rows[0]?.enabled || !(await verifyPassword(data.password, rows[0].password_hash))) {
      throw new Error("Current password is required to disable MFA");
    }
    await sql`
      UPDATE hw_user_mfa SET enabled = FALSE, disabled_at = NOW(), updated_at = NOW()
      WHERE user_id = ${context.userId}`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'disable', 'mfa', ${context.userId}, 'TOTP MFA disabled after password re-authentication')`;
    await recordSecurityEvent(sql, {
      eventType: "mfa_disabled",
      outcome: "allowed",
      severity: "warning",
      requestId: getRequestSecurityContext().requestId,
      context,
      resource: "mfa.disable",
    });
    return { ok: true as const };
  });

export const regenerateMfaRecoveryCodes = createServerFn({ method: "POST" })
  .validator(passwordInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<{ password_hash: string; enabled: boolean }[]>`
      SELECT u.password_hash, COALESCE(mfa.enabled, FALSE) AS enabled
      FROM hw_users u LEFT JOIN hw_user_mfa mfa ON mfa.user_id = u.id
      WHERE u.id = ${context.userId} LIMIT 1`;
    if (!rows[0]?.enabled || !(await verifyPassword(data.password, rows[0].password_hash))) {
      throw new Error("Current password is required to regenerate recovery codes");
    }
    const recoveryCodes = generateRecoveryCodes();
    const hashes = await hashedRecoveryCodes(recoveryCodes);
    await sql`
      UPDATE hw_user_mfa SET recovery_code_hashes = ${JSON.stringify(hashes)}::JSONB, updated_at = NOW()
      WHERE user_id = ${context.userId} AND enabled = TRUE`;
    await recordSecurityEvent(sql, {
      eventType: "mfa_recovery_codes_regenerated",
      outcome: "allowed",
      severity: "warning",
      requestId: getRequestSecurityContext().requestId,
      context,
      resource: "mfa.regenerate_recovery_codes",
    });
    return { recoveryCodes };
  });

export async function createMfaChallengeCodeForTests(secret: string) {
  return generateTotpCode(secret);
}
