import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { recordSecurityEvent } from "@/lib/security";
import { emailProviderState } from "@/lib/notifications/email";

export const getSystemHealthOverview = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "security.manage");
  const sql = requireDatabase();
  await sql`SELECT 1`;
  const [jobs, providers, events, identity] = await Promise.all([
    sql<
      { status: string; count: number }[]
    >`SELECT status, COUNT(*)::int AS count FROM hw_jobs WHERE school_id = ${context.schoolId} GROUP BY status`,
    sql<
      {
        provider_type: string;
        enabled: boolean;
        configuration_status: string;
        updated_at: string;
      }[]
    >`SELECT provider_type, enabled, configuration_status, updated_at FROM hw_v5_provider_configs WHERE school_id = ${context.schoolId} ORDER BY provider_type`,
    sql<
      {
        event_type: string;
        outcome: string;
        severity: string;
        resource: string | null;
        created_at: string;
      }[]
    >`SELECT event_type, outcome, severity, resource, created_at FROM hw_security_events WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 50`,
    sql<
      {
        require_email_verification: boolean;
        require_mfa_for_privileged: boolean;
        mfa_provider: string;
      }[]
    >`SELECT require_email_verification, require_mfa_for_privileged, mfa_provider FROM hw_identity_policies WHERE school_id = ${context.schoolId}`,
  ]);
  return {
    application: "healthy" as const,
    database: "ready" as const,
    email: emailProviderState(),
    jobs,
    providers,
    recentSecurityEvents: events,
    identityPolicy: identity[0] ?? {
      require_email_verification: true,
      require_mfa_for_privileged: false,
      mfa_provider: "configuration_required",
    },
    version: process.env.APP_VERSION ?? "unknown",
  };
});

export const revokeSchoolSessions = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "security.manage");
  const sql = requireDatabase();
  const rows = await sql<
    { count: number }[]
  >`WITH removed AS (DELETE FROM hw_sessions WHERE school_id = ${context.schoolId} RETURNING id) SELECT COUNT(*)::int AS count FROM removed`;
  await recordSecurityEvent(sql, {
    eventType: "session_revoke_all",
    outcome: "allowed",
    severity: "high",
    context,
    resource: "system.sessions",
    detail: { revoked: rows[0]?.count ?? 0 },
  });
  return { ok: true as const, revoked: Number(rows[0]?.count ?? 0) };
});

export const disableSchoolUser = createServerFn({ method: "POST" })
  .validator(
    z.object({ userId: z.string().min(1).max(160), reason: z.string().trim().min(10).max(500) }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "security.manage");
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      UPDATE hw_users u SET active = FALSE, updated_at = NOW()
      WHERE u.id = ${data.userId} AND EXISTS (SELECT 1 FROM hw_memberships m WHERE m.user_id = u.id AND m.school_id = ${context.schoolId}) RETURNING u.id`;
    if (!rows[0]) throw new Error("User is not active in this school");
    await sql`DELETE FROM hw_sessions WHERE user_id = ${data.userId} AND school_id = ${context.schoolId}`;
    await recordSecurityEvent(sql, {
      eventType: "user_disable",
      outcome: "allowed",
      severity: "high",
      context,
      resource: "system.users",
      detail: { targetUserId: data.userId, reason: data.reason },
    });
    return { ok: true as const };
  });
