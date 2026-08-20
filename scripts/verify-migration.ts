import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL is required for migration verification");
const sql = postgres(databaseUrl, {
  connect_timeout: 5,
  max: 1,
  ssl:
    process.env.NODE_ENV === "production" || databaseUrl.includes("supabase")
      ? "require"
      : undefined,
});
const expected = [
  "hw_schools",
  "hw_users",
  "hw_memberships",
  "hw_sessions",
  "hw_user_mfa",
  "hw_billing_subscriptions",
  "hw_billing_webhook_events",
  "hw_storage_objects",
  "hw_jobs",
];
try {
  const rows = await sql<{ name: string; present: string | null }[]>`
    SELECT name, to_regclass('public.' || name) AS present
    FROM unnest(${sql.array(expected)}::TEXT[]) AS item(name)`;
  const missing = rows.filter((row) => !row.present).map((row) => row.name);
  if (missing.length) {
    console.error(JSON.stringify({ status: "migration_incomplete", missing }));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ status: "migration_verified", tables: expected.length }));
  }
} finally {
  await sql.end({ timeout: 5 });
}
