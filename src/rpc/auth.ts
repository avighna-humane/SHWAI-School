// SERVER-ONLY. Secure Credentials-Driven Authentication utilizing PostgreSQL.
import { createServerFn } from "@tanstack/react-start";
import { assertValidFile } from "./files";

/** Helper to hash a password using SHA-256 on the server-side. */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "SHWAI_SALT_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export const signUp = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { email, password, name, role, schoolId } = data;

    if (!email || !password || !name || !role || !schoolId) {
      throw new Error("Missing required fields for signup.");
    }

    // Hash password securely
    const passwordHash = await hashPassword(password);

    // Call Supabase database to check if user already exists
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    // Insert user into profiles
    const { data: inserted, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        school_id: schoolId,
        email: email.toLowerCase().trim(),
        name,
        role,
        password_hash: passwordHash,
        status: "active"
      })
      .select("id, school_id, email, name, role")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to create user profile.");
    }

    return inserted;
  });

export const signInWithPassword = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, email, name, role, password_hash, status")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) {
      throw new Error("Invalid email or password.");
    }

    if (user.password_hash !== passwordHash) {
      throw new Error("Invalid email or password.");
    }

    if (user.status !== "active") {
      throw new Error("Your account has been deactivated. Contact administration.");
    }

    // Return session data securely (excluding password hash)
    return {
      sessionToken: "shwai_token_" + Math.random().toString(36).slice(2, 10),
      user: {
        id: user.id,
        schoolId: user.school_id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  });

export const resetPasswordForEmail = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { email, newPassword } = data;

    if (!email || !newPassword) {
      throw new Error("Email and new password are required.");
    }

    const passwordHash = await hashPassword(newPassword);

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!existing) {
      throw new Error("No user found with this email address.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("id", existing.id);

    if (error) {
      throw new Error("Failed to reset password.");
    }

    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" })
  .handler(async () => {
    return { ok: true };
  });
