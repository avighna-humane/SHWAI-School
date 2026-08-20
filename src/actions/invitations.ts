import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSession, hashPassword, requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import {
  consumeSecurityRateLimit,
  getRequestSecurityContext,
  hashIdentifier,
  recordSecurityEvent,
} from "@/lib/security";
import {
  EmailConfigurationRequiredError,
  EmailDeliveryError,
  sendEmail,
} from "@/lib/notifications/email";

const invitationSchema = z
  .object({
    email: z.string().trim().email().max(320),
    role: z.enum(["student", "teacher", "parent", "staff", "admin", "principal"]),
    targetEntityId: z.string().trim().max(120).default(""),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  })
  .refine(
    (value) => value.role !== "student" || Boolean(value.targetEntityId),
    "A student invitation must be linked to a student record",
  );

const acceptSchema = z.object({
  token: z.string().trim().min(20).max(240),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(200),
  privacyVersion: z.string().trim().min(1).max(40).default("v1"),
});

function rawToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function publicUrl(token: string) {
  const base = (
    process.env.PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:8080")
  ).replace(/\/$/, "");
  if (!base) throw new Error("PUBLIC_APP_URL is required in production");
  return `${base}/accept-invitation?token=${encodeURIComponent(token)}`;
}

export const createInvitation = createServerFn({ method: "POST" })
  .validator(invitationSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "users.invite");
    const sql = requireDatabase();
    const security = getRequestSecurityContext();
    const email = data.email.toLowerCase();
    await consumeSecurityRateLimit(sql, {
      scope: "invitation_school_admin",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 50,
      windowSeconds: 60 * 60,
    });
    if (data.targetEntityId) {
      const valid =
        await sql`SELECT 1 FROM ${data.role === "student" ? sql`hw_students` : data.role === "teacher" ? sql`hw_teachers` : data.role === "parent" ? sql`hw_parents` : sql`hw_staff`} WHERE id = ${data.targetEntityId} AND school_id = ${context.schoolId} LIMIT 1`;
      if (!valid[0]) throw new Error("The invitation target is not in this school");
    }
    const token = rawToken();
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_invitations (school_id, email, role, target_entity_id, token_hash, expires_at, invited_by)
      VALUES (${context.schoolId}, ${email}, ${data.role}, ${data.targetEntityId}, ${await hashIdentifier(token)}, NOW() + (${data.expiresInDays} || ' days')::INTERVAL, ${context.userId})
      RETURNING id`;
    const invitationId = rows[0]!.id;
    let delivery: "sent" | "configuration_required" | "failed" = "sent";
    try {
      await sendEmail({
        to: email,
        subject: `Invitation to join ${context.schoolName} on SHWAI`,
        text: `You have been invited to join ${context.schoolName} as ${data.role}. Accept within ${data.expiresInDays} days: ${publicUrl(token)}`,
        html: `<p>You have been invited to join ${context.schoolName} as ${data.role}.</p><p><a href="${publicUrl(token)}">Accept invitation</a></p>`,
      });
    } catch (error) {
      delivery =
        error instanceof EmailConfigurationRequiredError
          ? "configuration_required"
          : error instanceof EmailDeliveryError
            ? "failed"
            : "failed";
      await recordSecurityEvent(sql, {
        eventType: "invitation_delivery",
        outcome: "failed",
        severity: "warning",
        requestId: security.requestId,
        context,
        resource: "invitations.create",
        detail: { invitationId, emailHash: await hashIdentifier(email), delivery },
      });
    }
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'invitation', ${invitationId}, ${`Invitation created for role ${data.role}; delivery ${delivery}`})`;
    return { id: invitationId, delivery, status: "pending" as const };
  });

export const listInvitations = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "users.invite");
  const sql = requireDatabase();
  return sql`
    SELECT id, email, role, target_entity_id, status, expires_at, invited_by, accepted_by, accepted_at, created_at
    FROM hw_invitations WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 200`;
});

export const revokeInvitation = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "users.invite");
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      UPDATE hw_invitations SET status = 'revoked' WHERE id = ${data.id} AND school_id = ${context.schoolId} AND status = 'pending' RETURNING id`;
    if (!rows[0]) throw new Error("Invitation not found or already closed");
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'delete', 'invitation', ${data.id}, 'Invitation revoked')`;
    return { ok: true as const };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .validator(acceptSchema)
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const security = getRequestSecurityContext();
    await consumeSecurityRateLimit(sql, {
      scope: "invitation_accept_ip",
      subject: security.ipHash ?? "unknown",
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const tokenHash = await hashIdentifier(data.token);
    const passwordHash = await hashPassword(data.password);
    const result = (await sql.begin(async (tx) => {
      const invitations = await tx<
        {
          id: string;
          school_id: string;
          email: string;
          role: "student" | "teacher" | "parent" | "staff" | "admin" | "principal";
          target_entity_id: string;
          invited_by: string;
        }[]
      >`
        SELECT id, school_id, email, role, target_entity_id, invited_by FROM hw_invitations
        WHERE token_hash = ${tokenHash} AND status = 'pending' AND expires_at > NOW() FOR UPDATE`;
      const invitation = invitations[0];
      if (!invitation) return null;
      const existing = await tx<
        { id: string }[]
      >`SELECT id FROM hw_users WHERE LOWER(email) = LOWER(${invitation.email}) LIMIT 1`;
      const userRows = existing[0]
        ? await tx<
            { id: string }[]
          >`UPDATE hw_users SET name = ${data.name}, active = TRUE, email_verified_at = COALESCE(email_verified_at, NOW()), password_hash = ${passwordHash}, password_changed_at = NOW(), updated_at = NOW() WHERE id = ${existing[0].id} RETURNING id`
        : await tx<
            { id: string }[]
          >`INSERT INTO hw_users (email, name, password_hash, email_verified_at, password_changed_at) VALUES (${invitation.email}, ${data.name}, ${passwordHash}, NOW(), NOW()) RETURNING id`;
      const userId = userRows[0]!.id;
      await tx`
        INSERT INTO hw_user_consents (user_id, school_id, consent_type, version, granted)
        VALUES (${userId}, ${invitation.school_id}, 'terms_and_privacy', ${data.privacyVersion}, TRUE)`;
      const memberships = await tx<{ id: string; role: string }[]>`
        INSERT INTO hw_memberships (user_id, school_id, role, invited_by) VALUES (${userId}, ${invitation.school_id}, ${invitation.role}, ${invitation.invited_by})
        ON CONFLICT (user_id, school_id) DO UPDATE SET active = TRUE, invited_by = EXCLUDED.invited_by RETURNING id, role`;
      if (invitation.target_entity_id) {
        if (invitation.role === "student")
          await tx`UPDATE hw_students SET user_id = ${userId} WHERE id = ${invitation.target_entity_id} AND school_id = ${invitation.school_id} AND (user_id IS NULL OR user_id = ${userId})`;
        if (invitation.role === "teacher")
          await tx`UPDATE hw_teachers SET user_id = ${userId} WHERE id = ${invitation.target_entity_id} AND school_id = ${invitation.school_id} AND (user_id IS NULL OR user_id = ${userId})`;
        if (invitation.role === "parent")
          await tx`UPDATE hw_parents SET user_id = ${userId} WHERE id = ${invitation.target_entity_id} AND school_id = ${invitation.school_id} AND (user_id IS NULL OR user_id = ${userId})`;
        if (invitation.role === "staff")
          await tx`UPDATE hw_staff SET user_id = ${userId} WHERE id = ${invitation.target_entity_id} AND school_id = ${invitation.school_id} AND (user_id IS NULL OR user_id = ${userId})`;
      }
      await tx`UPDATE hw_invitations SET status = 'accepted', accepted_by = ${userId}, accepted_at = NOW() WHERE id = ${invitation.id}`;
      return {
        userId,
        schoolId: invitation.school_id,
        membershipId: memberships[0]!.id,
        role: memberships[0]!.role,
        invitationId: invitation.id,
      };
    })) as {
      userId: string;
      schoolId: string;
      membershipId: string;
      role: string;
      invitationId: string;
    } | null;
    if (!result) throw new Error("Invitation is invalid, expired, revoked, or already accepted");
    await createSession(result.userId, result.schoolId, result.membershipId);
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${result.schoolId}, ${result.userId}, ${data.name}, ${result.role}, 'create', 'membership', ${result.membershipId}, 'Invitation accepted and account activated')`;
    await recordSecurityEvent(sql, {
      eventType: "invitation_acceptance",
      outcome: "allowed",
      severity: "info",
      requestId: security.requestId,
      context: { userId: result.userId, schoolId: result.schoolId, role: result.role as never },
      resource: "invitations.accept",
      detail: { invitationId: result.invitationId },
    });
    return { ok: true as const, schoolId: result.schoolId, role: result.role };
  });
