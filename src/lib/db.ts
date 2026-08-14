import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";

if (!DB_URL && typeof window === "undefined") {
  console.warn(
    "[db] DATABASE_URL or SUPABASE_DATABASE_URL is not set; persistent workflows are unavailable",
  );
}

export const sql = postgres(DB_URL, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" || DB_URL.includes("supabase") ? "require" : undefined,
});

export function requireDatabase() {
  if (!DB_URL) {
    throw new Error(
      "Database configuration required. Set DATABASE_URL (or SUPABASE_DATABASE_URL) before using persistent SHWAI workflows.",
    );
  }
  return sql;
}

export function databaseConfigured() {
  return Boolean(DB_URL);
}
