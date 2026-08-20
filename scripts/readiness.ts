import postgres from "postgres";

type ReadinessState = "READY" | "WARNING" | "BLOCKED" | "CONFIGURATION_REQUIRED";

type Check = {
  component: string;
  state: ReadinessState;
  detail: string;
};

const checks: Check[] = [];
const configured = (name: string) => Boolean(process.env[name]?.trim());
const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";

function add(component: string, state: ReadinessState, detail: string) {
  checks.push({ component, state, detail });
}

let databaseReady = false;
let schemaReady = false;
let sql: ReturnType<typeof postgres> | undefined;

if (!databaseUrl) {
  add("database", "BLOCKED", "DATABASE_URL or SUPABASE_DATABASE_URL is required.");
  add(
    "migrations",
    "BLOCKED",
    "A reachable PostgreSQL database is required before migrations can be checked.",
  );
} else {
  try {
    sql = postgres(databaseUrl, {
      connect_timeout: 3,
      idle_timeout: 3,
      max: 1,
      ssl:
        process.env.NODE_ENV === "production" || databaseUrl.includes("supabase")
          ? "require"
          : undefined,
    });
    await sql`SELECT 1`;
    databaseReady = true;
    add("database", "READY", "PostgreSQL accepted a health query.");
    const schemaRows = await sql<{ schema_name: string | null }[]>`
      SELECT to_regclass('public.hw_schools') AS schema_name`;
    schemaReady = Boolean(schemaRows[0]?.schema_name);
    add(
      "migrations",
      schemaReady ? "READY" : "BLOCKED",
      schemaReady
        ? "The core SHWAI schema is present."
        : "Run npm run db:migrate before serving persisted workflows.",
    );
  } catch {
    add(
      "database",
      "BLOCKED",
      "PostgreSQL is configured but unreachable or rejected the health query.",
    );
    add(
      "migrations",
      "BLOCKED",
      "Migration state cannot be verified until PostgreSQL is reachable.",
    );
  }
}

if (databaseReady && schemaReady) {
  add(
    "authentication",
    "READY",
    "Database-backed users, memberships, and sessions can be resolved.",
  );
} else {
  add("authentication", "BLOCKED", "Authentication requires the migrated SHWAI PostgreSQL schema.");
}

const productionEnvironmentReady =
  process.env.NODE_ENV !== "production" ||
  (configured("PUBLIC_APP_URL") && configured("SHWAI_TRUSTED_ORIGINS"));
add(
  "environment",
  productionEnvironmentReady ? "READY" : "BLOCKED",
  productionEnvironmentReady
    ? "Required environment boundary is present for the current NODE_ENV."
    : "Production requires PUBLIC_APP_URL and SHWAI_TRUSTED_ORIGINS.",
);
add(
  "cors",
  configured("SHWAI_TRUSTED_ORIGINS") ? "READY" : "CONFIGURATION_REQUIRED",
  configured("SHWAI_TRUSTED_ORIGINS")
    ? "Trusted origins are explicitly configured."
    : "Set SHWAI_TRUSTED_ORIGINS before exposing authenticated browser requests.",
);

const providerChecks: Array<{ component: string; variables: string[]; detail: string }> = [
  {
    component: "email",
    variables: ["EMAIL_PROVIDER_URL", "EMAIL_PROVIDER_API_KEY", "EMAIL_FROM"],
    detail: "Email verification, recovery, and invitations require a configured provider.",
  },
  {
    component: "storage",
    variables: [
      "STORAGE_PROVIDER",
      "STORAGE_ENDPOINT",
      "STORAGE_BUCKET",
      "STORAGE_ACCESS_KEY_ID",
      "STORAGE_SECRET_ACCESS_KEY",
    ],
    detail: "Private object storage requires all server-side bucket and credential settings.",
  },
  {
    component: "ai",
    variables: ["BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY"],
    detail: "AI requests require a server-side OpenAI-compatible provider URL and key.",
  },
  {
    component: "billing",
    variables: ["PAYMENT_PROVIDER", "PAYMENT_API_KEY", "PAYMENT_WEBHOOK_SECRET"],
    detail: "Paid entitlements require a provider checkout and verified webhook configuration.",
  },
];

for (const provider of providerChecks) {
  const ready = provider.variables.every(configured);
  add(
    provider.component,
    ready ? "READY" : "CONFIGURATION_REQUIRED",
    ready ? "Required provider variables are present." : provider.detail,
  );
}

add(
  "background_jobs",
  databaseReady && configured("SHWAI_JOB_RUNNER_SECRET") ? "WARNING" : "CONFIGURATION_REQUIRED",
  databaseReady && configured("SHWAI_JOB_RUNNER_SECRET")
    ? "The authenticated job endpoint is configured; a durable worker still requires deployment verification."
    : "Set SHWAI_JOB_RUNNER_SECRET and deploy a durable worker for asynchronous workflows.",
);
add(
  "monitoring",
  configured("SENTRY_DSN") || configured("OTEL_EXPORTER_OTLP_ENDPOINT")
    ? "READY"
    : "CONFIGURATION_REQUIRED",
  configured("SENTRY_DSN") || configured("OTEL_EXPORTER_OTLP_ENDPOINT")
    ? "An error or telemetry destination is configured."
    : "Configure SENTRY_DSN or OTEL_EXPORTER_OTLP_ENDPOINT before production operations.",
);
add(
  "backups",
  "CONFIGURATION_REQUIRED",
  "Backup/PITR policy and restore evidence must be supplied by the deployment provider.",
);
add(
  "security_headers",
  "READY",
  "Security headers and trusted-origin middleware are implemented in the application server.",
);

const overall: ReadinessState = checks.some((check) => check.state === "BLOCKED")
  ? "BLOCKED"
  : checks.some((check) => check.state === "CONFIGURATION_REQUIRED" || check.state === "WARNING")
    ? "WARNING"
    : "READY";

console.log(
  JSON.stringify({ status: overall, generatedAt: new Date().toISOString(), checks }, null, 2),
);
if (sql) await sql.end({ timeout: 1 });
process.exitCode = overall === "READY" ? 0 : 1;
