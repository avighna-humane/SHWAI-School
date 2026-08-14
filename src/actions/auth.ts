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
  schoolId: z.string().min(1).optional(),
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
          VALUES (${userId}, ${data.email.toLowerCase()}, ${data.name}, ${passwordHash})`;
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
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message.includes("duplicate key") || message.includes("unique"))
        throw new Error("An account with this email already exists");
      throw error;
    }
  });

export const login = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const sql = requireDatabase();
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
      WHERE LOWER(u.email) = LOWER(${data.email})
        AND u.active = TRUE
        ${data.schoolId ? sql`AND m.school_id = ${data.schoolId}` : sql``}
      ORDER BY m.created_at ASC
      LIMIT 1`;

    const user = users[0];
    const valid = user ? await verifyPassword(data.password, user.password_hash) : false;
    if (!user || !valid) throw new Error("Invalid email or password");

    await createSession(user.user_id, user.school_id, user.membership_id);
    await sql`
      INSERT INTO hw_audit_events
        (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES
        (${user.school_id}, ${user.user_id}, ${user.name}, ${user.role}, 'login', 'session', ${user.user_id}, 'Authenticated login')`;
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
  await clearSession();
  return { ok: true as const };
});
