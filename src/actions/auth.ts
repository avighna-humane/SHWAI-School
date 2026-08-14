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
} from "@/lib/auth";
import {
  consumeSecurityRateLimit,
  getRequestSecurityContext,
  hashIdentifier,
  recordSecurityEvent,
  SecurityPolicyError,
} from "@/lib/security";

export type AuthenticatedUser =
  Awaited<ReturnType<typeof getAuthContext>> extends infer T ? Exclude<T, null> : never;

const registrationInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
  schoolName: z.string().trim().min(2).max(160),
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

    try {
      const membershipId = await sql.begin(async (tx) => {
        await tx`
          INSERT INTO hw_schools (id, name, slug)
          VALUES (${schoolId}, ${data.schoolName}, ${slug})`;
        await tx`
          INSERT INTO hw_users (id, email, name, password_hash)
          VALUES (${userId}, ${email}, ${data.name}, ${passwordHash})`;
        const memberships = await tx<{ id: string }[]>`
          INSERT INTO hw_memberships (user_id, school_id, role)
          VALUES (${userId}, ${schoolId}, 'owner')
          RETURNING id`;
        return memberships[0]!.id;
      });

      await createSession(userId, schoolId, membershipId);
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
      return { ok: true as const };
    } catch (error) {
      if (error instanceof SecurityPolicyError) throw error;
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message.includes("duplicate key") || message.includes("unique"))
        throw new Error("An account with this email already exists");
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
      }[]
    >`
      SELECT u.id AS user_id, u.email, u.name, u.password_hash,
             m.school_id, s.name AS school_name, m.id AS membership_id, m.role
      FROM hw_users u
      JOIN hw_memberships m ON m.user_id = u.id AND m.active = TRUE
      JOIN hw_schools s ON s.id = m.school_id AND s.active = TRUE
        WHERE LOWER(u.email) = LOWER(${email})
        AND u.active = TRUE
        ${data.schoolId ? sql`AND m.school_id = ${data.schoolId}` : sql``}
      ORDER BY m.created_at ASC
      LIMIT 1`;

    const user = users[0];
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ?? (await hashPassword("invalid-login-password")),
    );
    if (!user || !valid) {
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

export const currentUser = createServerFn({ method: "GET" }).handler(async () => {
  return getAuthContext();
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
