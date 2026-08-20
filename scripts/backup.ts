import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";
const outputDir =
  process.env.BACKUP_OUTPUT_DIR?.trim() ||
  (process.env.NODE_ENV === "production" ? "" : "/tmp/shwai-backups");
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS ?? 30));

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

if (!databaseUrl) throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL is required for a backup");
if (!outputDir) throw new Error("BACKUP_OUTPUT_DIR is required in production");
if (process.env.NODE_ENV === "production" && !process.env.BACKUP_PROVIDER?.trim()) {
  throw new Error("BACKUP_PROVIDER is required in production; use managed private backup storage");
}

await mkdir(outputDir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dumpPath = join(outputDir, `shwai-${stamp}.dump`);
const manifestPath = `${dumpPath}.manifest.json`;
await run("pg_dump", [
  "--format=custom",
  "--no-owner",
  "--no-privileges",
  "--file",
  dumpPath,
  databaseUrl,
]);
const dumpStat = await stat(dumpPath);
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      format: "postgres-custom",
      sizeBytes: dumpStat.size,
      retentionDays,
      provider: process.env.BACKUP_PROVIDER?.trim() || "local-verification-only",
      restoreCommand: "npm run db:restore:test",
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
for (const name of await readdir(outputDir)) {
  if (!name.startsWith("shwai-") || !name.endsWith(".dump")) continue;
  const path = join(outputDir, name);
  if ((await stat(path)).mtimeMs < cutoff) {
    await rm(path, { force: true });
    await rm(`${path}.manifest.json`, { force: true });
  }
}
console.log(
  JSON.stringify({
    status: "backup_created",
    file: dumpPath,
    sizeBytes: dumpStat.size,
    retentionDays,
  }),
);
