import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import postgres from "postgres";

const dumpPath = process.env.RESTORE_DUMP_PATH ?? process.argv[2] ?? "";
const restoreDatabaseUrl = process.env.RESTORE_DATABASE_URL ?? "";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "inherit", "inherit"],
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? "unknown"}`)),
    );
  });
}

if (!dumpPath) throw new Error("Set RESTORE_DUMP_PATH or pass a custom-format dump path");
if (!restoreDatabaseUrl)
  throw new Error("RESTORE_DATABASE_URL must point to an isolated restore database");
if (
  process.env.NODE_ENV === "production" &&
  restoreDatabaseUrl === (process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL)
) {
  throw new Error("Restore tests cannot target the primary production database");
}
const dump = await stat(dumpPath);
if (!dump.isFile() || dump.size === 0) throw new Error("Restore dump is missing or empty");
await run("pg_restore", [
  "--exit-on-error",
  "--no-owner",
  "--no-privileges",
  "--dbname",
  restoreDatabaseUrl,
  dumpPath,
]);
const sql = postgres(restoreDatabaseUrl, { connect_timeout: 10, max: 1 });
try {
  const rows = await sql<
    { schools: string | null; sessions: string | null; storage: string | null }[]
  >`
    SELECT
      to_regclass('public.hw_schools') AS schools,
      to_regclass('public.hw_sessions') AS sessions,
      to_regclass('public.hw_storage_objects') AS storage`;
  const row = rows[0];
  if (!row?.schools || !row.sessions || !row.storage)
    throw new Error("Restored schema is missing required SHWAI tables");
  console.log(
    JSON.stringify({ status: "restore_verified", dumpPath, sizeBytes: dump.size, checks: row }),
  );
} finally {
  await sql.end({ timeout: 5 });
}
