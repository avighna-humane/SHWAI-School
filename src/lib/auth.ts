import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { requireDatabase } from "@/lib/db";
import type { PlanId } from "@/types";
import { constantTimeEqual } from "@/lib/security";

export const SESSION_COOKIE = "shwai_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const PBKDF2_ITERATIONS = 210_000;

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  schoolId: string;
  schoolName: string;
  role: "student" | "teacher" | "parent" | "staff" | "admin" | "principal" | "owner";
  membershipId: string;
  plan: PlanId;
  subscriptionStatus: string;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(bytes));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsRaw, saltRaw, expectedRaw] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (
    algorithm !== "pbkdf2-sha256" ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 600_000 ||
    !saltRaw ||
    !expectedRaw
  )
    return false;
  try {
    const salt = base64ToBytes(saltRaw);
    const expected = base64ToBytes(expectedRaw);
    if (salt.length < 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key,
      256,
    );
    return constantTimeEqual(new Uint8Array(bits), expected);
  } catch {
    return false;
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || getRequestProtocol() === "https",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(userId: string, schoolId: string, membershipId: string) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64(tokenBytes);
  const tokenHash = await digest(token);
  const sql = requireDatabase();
  await sql`
    INSERT INTO hw_sessions (token_hash, user_id, school_id, membership_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${schoolId}, ${membershipId}, NOW() + INTERVAL '8 hours')`;
  setCookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const sql = requireDatabase();
    await sql`DELETE FROM hw_sessions WHERE token_hash = ${await digest(token)}`;
  }
  deleteCookie(SESSION_COOKIE, sessionCookieOptions());
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const sql = requireDatabase();
  const tokenHash = await digest(token);
  const rows = await sql<AuthContext[]>`
    SELECT u.id AS user_id, u.email, u.name, m.school_id, s.name AS school_name,
           m.role, m.id AS membership_id, s.plan, s.subscription_status
    FROM hw_sessions session
    JOIN hw_users u ON u.id = session.user_id AND u.active = TRUE
    JOIN hw_memberships m ON m.id = session.membership_id AND m.active = TRUE
    JOIN hw_schools s ON s.id = m.school_id AND s.active = TRUE
    WHERE session.token_hash = ${tokenHash} AND session.expires_at > NOW()
    LIMIT 1`;
  return rows[0] ?? null;
}

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) throw new Error("Authentication required");
  return context;
}

export function requireRole(context: AuthContext, roles: readonly AuthContext["role"][]) {
  if (!roles.includes(context.role)) throw new Error("Permission denied");
}

export function requireSchool(context: AuthContext, schoolId: string) {
  if (context.schoolId !== schoolId) throw new Error("Cross-school access denied");
}
