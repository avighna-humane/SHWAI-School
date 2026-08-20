import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDatabase } from "@/lib/db";
import {
  clearSession,
  createSession,
  getAuthContext,
  hashPassword,
  requireAuth,
  verifyPassword,
  type AuthContext,
} from "@/lib/auth";
import {
  consumeSecurityRateLimit,
  getRequestSecurityContext,
  hashIdentifier,
  recordSecurityEvent,
  SecurityPolicyError,
} from "@/lib/security";
import {
  EmailConfigurationRequiredError,
  EmailDeliveryError,
  sendEmail,
} from "@/lib/notifications/email";

export type AuthenticatedUser =
  Awaited<ReturnType<typeof getAuthContext>> extends infer T ? Exclude<T, null> : never;

const registrationInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
  schoolName: z.string().trim().min(2).max(160),
  termsAccepted: z.literal(true),
  privacyVersion: z.string().trim().min(1).max(40).default("v1"),
});

const loginInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
  schoolId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,160}$/)
    .optional(),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "school"
  );
}

function createRawToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function appUrl(path: string, token: string) {
  const base = (
    process.env.PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:8080")
  ).replace(/\/$/, "");
  if (!base) throw new Error("PUBLIC_APP_URL is required in production");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export const register = createServerFn({ method: "POST" })
  .validator(registrationInput)
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const security = getRequestSecurityContext();
    const email = data.email.toLowerCase();
    await consumeSecurityRateLimit(sql, {
      scope: "registration_ip",
      subject: security.ipHash ?? "unknown",
      limit: 5,
      windowSeconds: 60 * 60,
    });
    await consumeSecurityRateLimit(sql, {
      scope: "registration_email",
      subject: await hashIdentifier(email),
      limit: 3,
      windowSeconds: 24 * 60 * 60,
    });
    const userId = `usr-${crypto.randomUUID()}`;
    const schoolId = `sch-${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(data.password);
    const slug = `${slugify(data.schoolName)}-${crypto.randomUUID().slice(0, 8)}`;
    const verificationToken = createRawToken();
    const verificationTokenHash = await hashIdentifier(verificationToken);

    try {
      const membershipId = await sql.begin(async (tx) => {
        await tx`
          INSERT INTO hw_schools (id, name, slug)
          VALUES (${schoolId}, ${data.schoolName}, ${slug})`;
        await tx`
          INSERT INTO hw_users (id, email, name, password_hash, password_changed_at)
          VALUES (${userId}, ${email}, ${data.name}, ${passwordHash}, NOW())`;
        await tx`
          INSERT INTO hw_identity_policies (school_id, updated_by)
          VALUES (${schoolId}, ${userId})`;
        await tx`
          INSERT INTO hw_user_consents (user_id, school_id, consent_type, version, granted)
          VALUES (${userId}, ${schoolId}, 'terms_and_privacy', ${data.privacyVersion}, TRUE)`;
        await tx`
          INSERT INTO hw_email_verification_tokens (user_id, token_hash, expires_at)
          VALUES (${userId}, ${verificationTokenHash}, NOW() + INTERVAL '24 hours')`;
        const memberships = await tx<{ id: string }[]>`
          INSERT INTO hw_memberships (user_id, school_id, role)
          VALUES (${userId}, ${schoolId}, 'owner')
          RETURNING id`;
        return memberships[0]!.id;
      });

      let emailDelivery: "sent" | "configuration_required" | "failed" = "sent";
      try {
        await sendEmail({
          to: email,
          subject: "Verify your SHWAI school account",
          text: `Verify your SHWAI account within 24 hours: ${appUrl("/verify-email", verificationToken)}`,
          html: `<p>Verify your SHWAI account within 24 hours.</p><p><a href="${appUrl("/verify-email", verificationToken)}">Verify email</a></p>`,
        });
      } catch (error) {
        emailDelivery =
          error instanceof EmailConfigurationRequiredError
            ? "configuration_required"
            : error instanceof EmailDeliveryError
              ? "failed"
              : "failed";
        await recordSecurityEvent(sql, {
          eventType: "email_verification_delivery",
          outcome: "failed",
          severity: "warning",
          requestId: security.requestId,
          context: { userId, schoolId, role: "owner" },
          resource: "auth.register",
          detail: { emailHash: await hashIdentifier(email), delivery: emailDelivery },
        });
      }
      await sql`
        INSERT INTO hw_audit_events
          (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
        VALUES
          (${schoolId}, ${userId}, ${data.name}, 'owner', 'login', 'user', ${userId}, 'Account registration and session creation')`;
      await recordSecurityEvent(sql, {
        eventType: "registration",
        outcome: "allowed",
        severity: "info",
        requestId: security.requestId,
        context: { userId, schoolId, role: "owner" },
        resource: "auth.register",
        detail: { emailHash: await hashIdentifier(email) },
      });
      return {
        ok: true as const,
        verificationRequired: true as const,
        emailDelivery,
        message:
          emailDelivery === "sent"
            ? "Account created. Check your email to verify access."
            : "Account created, but email delivery is not configured. Configure the email provider before signing in.",
      };
    } catch (error) {
      if (error instanceof SecurityPolicyError) throw error;
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message.includes("duplicate key") || message.includes("unique"))
        throw new Error(
          "Registration could not be completed. Please use the sign-in or recovery flow if needed.",
        );
      throw new Error("Registration failed. Please retry.");
    }
  });

export const login = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const security = getRequestSecurityContext();
    const email = data.email.toLowerCase();
    await consumeSecurityRateLimit(sql, {
      scope: "login_ip",
      subject: security.ipHash ?? "unknown",
      limit: 30,
      windowSeconds: 15 * 60,
    });
    await consumeSecurityRateLimit(sql, {
      scope: "login_email",
      subject: await hashIdentifier(email),
      limit: 12,
      windowSeconds: 15 * 60,
    });
    const users = await sql<
      {
        user_id: string;
        email: string;
        name: string;
        password_hash: string;
        school_id: string;
        school_name: string;
        membership_id: string;
        role: "student" | "teacher" | "parent" | "staff" | "admin" | "principal" | "owner";
        email_verified_at: string | null;
        require_email_verification: boolean;
        require_mfa_for_privileged: boolean;
        failed_login_count: number;
        locked_until: string | null;
      }[]
    >`
      SELECT u.id AS user_id, u.email, u.name, u.password_hash, u.email_verified_at,
             u.failed_login_count, u.locked_until,
             m.school_id, s.name AS school_name, m.id AS membership_id, m.role,
             COALESCE((SELECT require_email_verification FROM hw_identity_policies WHERE school_id = m.school_id), TRUE) AS require_email_verification,
             COALESCE((SELECT require_mfa_for_privileged FROM hw_identity_policies WHERE school_id = m.school_id), FALSE) AS require_mfa_for_privileged
      FROM hw_users u
      JOIN hw_memberships m ON m.user_id = u.id AND m.active = TRUE
      JOIN hw_schools s ON s.id = m.school_id AND s.active = TRUE
        WHERE LOWER(u.email) = LOWER(${email})
        AND u.active = TRUE
        ${data.schoolId ? sql`AND m.school_id = ${data.schoolId}` : sql``}
      ORDER BY m.created_at ASC
      LIMIT 1`;

    const user = users[0];
    if (user?.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      await recordSecurityEvent(sql, {
        eventType: "login",
        outcome: "blocked",
        severity: "high",
        requestId: security.requestId,
        context: { userId: user.user_id, schoolId: user.school_id, role: user.role },
        resource: "auth.login",
        detail: { reason: "account_locked" },
      });
      throw new Error("Invalid email or password");
    }
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ?? (await hashPassword("invalid-login-password")),
    );
    if (!user || !valid) {
      if (user) {
        await sql`
          UPDATE hw_users
          SET failed_login_count = failed_login_count + 1,
              locked_until = CASE
                WHEN failed_login_count + 1 >= 10 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
              END,
              updated_at = NOW()
          WHERE id = ${user.user_id}`;
      }
      await recordSecurityEvent(sql, {
        eventType: "login",
        outcome: "denied",
        severity: "warning",
        requestId: security.requestId,
        resource: "auth.login",
        detail: { emailHash: await hashIdentifier(email), reason: "invalid_credentials" },
      });
      throw new Error("Invalid email or password");
    }

    if (user.require_mfa_for_privileged && ["owner", "principal", "admin"].includes(user.role)) {
      await recordSecurityEvent(sql, {
        eventType: "login",
        outcome: "blocked",
        severity: "high",
        requestId: security.requestId,
        context: { userId: user.user_id, schoolId: user.school_id, role: user.role },
        resource: "auth.login",
        detail: { reason: "mfa_required_provider_unconfigured" },
      });
      throw new Error(
        "MFA is required for this school, but no verified MFA provider is configured",
      );
    }

    if (user.require_email_verification && !user.email_verified_at) {
      await recordSecurityEvent(sql, {
        eventType: "login",
        outcome: "denied",
        severity: "warning",
        requestId: security.requestId,
        context: { userId: user.user_id, schoolId: user.school_id, role: user.role },
        resource: "auth.login",
        detail: { reason: "email_unverified" },
      });
      throw new Error("Email verification required before sign-in");
    }

    await sql`
      UPDATE hw_users SET failed_login_count = 0, locked_until = NULL, updated_at = NOW()
      WHERE id = ${user.user_id}`;
    await clearSession();
    await createSession(user.user_id, user.school_id, user.membership_id);
    await sql`
      INSERT INTO hw_audit_events
        (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES
        (${user.school_id}, ${user.user_id}, ${user.name}, ${user.role}, 'login', 'session', ${user.user_id}, 'Authenticated login')`;
    await recordSecurityEvent(sql, {
      eventType: "login",
      outcome: "allowed",
      severity: "info",
      requestId: security.requestId,
      context: { userId: user.user_id, schoolId: user.school_id, role: user.role },
      resource: "auth.login",
      detail: { emailHash: await hashIdentifier(email) },
    });
    return {
      ok: true as const,
      user: { name: user.name, email: user.email, schoolId: user.school_id, role: user.role },
    };
  });

const tokenInput = z.object({ token: z.string().trim().min(20).max(240) });

export const verifyEmail = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const tokenHash = await hashIdentifier(data.token);
    const rows = await sql<{ user_id: string; school_id: string }[]>`
      UPDATE hw_email_verification_tokens t
      SET used_at = NOW()
      FROM hw_users u
      JOIN hw_memberships m ON m.user_id = u.id AND m.active = TRUE
      WHERE t.user_id = u.id AND t.token_hash = ${tokenHash} AND t.used_at IS NULL AND t.expires_at > NOW()
      RETURNING u.id AS user_id, m.school_id`;
    if (!rows[0]) throw new Error("Verification link is invalid or expired");
    await sql`UPDATE hw_users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ${rows[0].user_id}`;
    await recordSecurityEvent(sql, {
      eventType: "email_verification",
      outcome: "allowed",
      severity: "info",
      context: { userId: rows[0].user_id, schoolId: rows[0].school_id },
      resource: "auth.verify_email",
    });
    return { ok: true as const };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email().max(320) }))
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const security = getRequestSecurityContext();
    const email = data.email.toLowerCase();
    await consumeSecurityRateLimit(sql, {
      scope: "password_reset_ip",
      subject: security.ipHash ?? "unknown",
      limit: 10,
      windowSeconds: 60 * 60,
    });
    await consumeSecurityRateLimit(sql, {
      scope: "password_reset_email",
      subject: await hashIdentifier(email),
      limit: 5,
      windowSeconds: 24 * 60 * 60,
    });
    const users = await sql<{ user_id: string; school_id: string }[]>`
      SELECT u.id AS user_id, m.school_id FROM hw_users u JOIN hw_memberships m ON m.user_id = u.id AND m.active = TRUE
      WHERE LOWER(u.email) = LOWER(${email}) AND u.active = TRUE LIMIT 1`;
    if (users[0]) {
      const rawToken = createRawToken();
      await sql`INSERT INTO hw_password_reset_tokens (user_id, token_hash, expires_at) VALUES (${users[0].user_id}, ${await hashIdentifier(rawToken)}, NOW() + INTERVAL '1 hour')`;
      try {
        await sendEmail({
          to: email,
          subject: "Reset your SHWAI password",
          text: `Reset your password within one hour: ${appUrl("/reset-password", rawToken)}`,
          html: `<p>Reset your password within one hour.</p><p><a href="${appUrl("/reset-password", rawToken)}">Reset password</a></p>`,
        });
      } catch (error) {
        await recordSecurityEvent(sql, {
          eventType: "password_reset_delivery",
          outcome: "failed",
          severity: "warning",
          requestId: security.requestId,
          context: { userId: users[0].user_id, schoolId: users[0].school_id },
          resource: "auth.request_password_reset",
          detail: {
            emailHash: await hashIdentifier(email),
            configurationRequired: error instanceof EmailConfigurationRequiredError,
          },
        });
      }
    }
    return {
      accepted: true as const,
      message: "If the account exists, reset instructions will be sent.",
    };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator(tokenInput.extend({ password: z.string().min(12).max(200) }))
  .handler(async ({ data }) => {
    const sql = requireDatabase();
    const tokenHash = await hashIdentifier(data.token);
    const passwordHash = await hashPassword(data.password);
    const rows = (await sql.begin(async (tx) => {
      const valid = await tx<{ user_id: string; school_id: string }[]>`
        SELECT t.user_id, m.school_id FROM hw_password_reset_tokens t JOIN hw_memberships m ON m.user_id = t.user_id AND m.active = TRUE
        WHERE t.token_hash = ${tokenHash} AND t.used_at IS NULL AND t.expires_at > NOW() LIMIT 1`;
      if (!valid[0]) return [];
      await tx`UPDATE hw_users SET password_hash = ${passwordHash}, password_changed_at = NOW(), updated_at = NOW() WHERE id = ${valid[0].user_id}`;
      await tx`UPDATE hw_password_reset_tokens SET used_at = NOW() WHERE token_hash = ${tokenHash}`;
      await tx`DELETE FROM hw_sessions WHERE user_id = ${valid[0].user_id}`;
      return valid;
    })) as { user_id: string; school_id: string }[];
    if (!rows[0]) throw new Error("Reset link is invalid or expired");
    await recordSecurityEvent(sql, {
      eventType: "password_reset",
      outcome: "allowed",
      severity: "info",
      context: { userId: rows[0].user_id, schoolId: rows[0].school_id },
      resource: "auth.reset_password",
    });
    return { ok: true as const };
  });

export const listMemberships = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql<
    {
      id: string;
      school_id: string;
      school_name: string;
      role: AuthContext["role"];
      active: boolean;
    }[]
  >`
    SELECT m.id, m.school_id, s.name AS school_name, m.role, m.active
    FROM hw_memberships m JOIN hw_schools s ON s.id = m.school_id AND s.active = TRUE
    WHERE m.user_id = ${context.userId} AND m.active = TRUE ORDER BY s.name`;
});

export const switchSchool = createServerFn({ method: "POST" })
  .validator(z.object({ membershipId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<{ school_id: string; role: AuthContext["role"] }[]>`
      SELECT school_id, role FROM hw_memberships WHERE id = ${data.membershipId} AND user_id = ${context.userId} AND active = TRUE`;
    if (!rows[0]) throw new Error("Membership is not available");
    await clearSession();
    await createSession(context.userId, rows[0].school_id, data.membershipId);
    await recordSecurityEvent(sql, {
      eventType: "school_switch",
      outcome: "allowed",
      severity: "info",
      context: { userId: context.userId, schoolId: rows[0].school_id, role: rows[0].role },
      resource: "auth.switch_school",
    });
    return { ok: true as const, schoolId: rows[0].school_id };
  });

export const currentUser = createServerFn({ method: "GET" }).handler(async () => {
  return getAuthContext();
});

export const logoutAllSessions = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  await sql`DELETE FROM hw_sessions WHERE user_id = ${context.userId}`;
  await sql`
    INSERT INTO hw_audit_events
      (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
    VALUES
      (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'logout-all', 'session', ${context.userId}, 'All authenticated sessions revoked')`;
  await recordSecurityEvent(sql, {
    eventType: "logout_all_sessions",
    outcome: "allowed",
    severity: "warning",
    requestId: getRequestSecurityContext().requestId,
    context,
    resource: "auth.logout_all_sessions",
  });
  return clearSession().then(() => ({ ok: true as const }));
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  await sql`
      INSERT INTO hw_audit_events
        (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'logout', 'session', ${context.userId}, 'Authenticated logout')`;
  await recordSecurityEvent(sql, {
    eventType: "logout",
    outcome: "allowed",
    severity: "info",
    context,
    resource: "auth.logout",
  });
  await clearSession();
  return { ok: true as const };
});
