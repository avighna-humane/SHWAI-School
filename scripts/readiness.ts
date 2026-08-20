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
    const schemaRows = await sql<
      {
        schools: string | null;
        sessions: string | null;
        mfa: string | null;
        billing: string | null;
        webhooks: string | null;
        storage: string | null;
      }[]
    >`
      SELECT
        to_regclass('public.hw_schools') AS schools,
        to_regclass('public.hw_sessions') AS sessions,
        to_regclass('public.hw_user_mfa') AS mfa,
        to_regclass('public.hw_billing_subscriptions') AS billing,
        to_regclass('public.hw_billing_webhook_events') AS webhooks,
        to_regclass('public.hw_storage_objects') AS storage`;
    const schema = schemaRows[0];
    const missingTables = [
      ["hw_schools", schema?.schools],
      ["hw_sessions", schema?.sessions],
      ["hw_user_mfa", schema?.mfa],
      ["hw_billing_subscriptions", schema?.billing],
      ["hw_billing_webhook_events", schema?.webhooks],
      ["hw_storage_objects", schema?.storage],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
    schemaReady = missingTables.length === 0;
    add(
      "migrations",
      schemaReady ? "READY" : "BLOCKED",
      schemaReady
        ? "Core, MFA, and billing tables are present."
        : `Run npm run db:migrate; missing tables: ${missingTables.join(", ")}.`,
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
  "trusted_origins",
  configured("SHWAI_TRUSTED_ORIGINS") ? "READY" : "CONFIGURATION_REQUIRED",
  configured("SHWAI_TRUSTED_ORIGINS")
    ? "Trusted origins are explicitly configured."
    : "Set SHWAI_TRUSTED_ORIGINS before exposing authenticated browser requests.",
);
const httpsReady =
  process.env.NODE_ENV !== "production" ||
  /^https:\/\//i.test(process.env.PUBLIC_APP_URL?.trim() ?? "");
add(
  "https",
  httpsReady ? "READY" : "BLOCKED",
  httpsReady
    ? "The current environment has an acceptable application URL boundary."
    : "Production requires PUBLIC_APP_URL to use HTTPS.",
);

add(
  "mfa",
  process.env.NODE_ENV === "production" && !configured("MFA_ENCRYPTION_KEY")
    ? "CONFIGURATION_REQUIRED"
    : "READY",
  process.env.NODE_ENV === "production" && !configured("MFA_ENCRYPTION_KEY")
    ? "Production TOTP enrollment requires MFA_ENCRYPTION_KEY in secret storage."
    : "TOTP enrollment and login challenge code are available in the application.",
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
  const ready =
    provider.component === "ai"
      ? provider.variables.every(configured) ||
        (configured("OPENAI_API_BASE") && configured("OPENAI_API_KEY"))
      : provider.variables.every(configured);
  const scannerReady =
    provider.component !== "storage" ||
    (configured("MALWARE_SCANNER_URL") && configured("MALWARE_SCANNER_API_KEY"));
  const state =
    provider.component === "billing" && ready
      ? "WARNING"
      : provider.component === "storage" && ready && !scannerReady
        ? "WARNING"
        : ready
          ? "READY"
          : "CONFIGURATION_REQUIRED";
  add(
    provider.component,
    state,
    provider.component === "billing" && ready
      ? "Signed webhook variables are present; checkout, customer creation, and provider sandbox evidence are still required."
      : provider.component === "storage" && ready && !scannerReady
        ? "Private storage is configured, but malware scanner credentials are still required before document downloads can be enabled."
        : ready
          ? "Required provider variables are present."
          : provider.detail,
  );
}

add(
  "background_jobs",
  databaseReady && configured("SHWAI_JOB_RUNNER_SECRET") ? "WARNING" : "CONFIGURATION_REQUIRED",
  databaseReady && configured("SHWAI_JOB_RUNNER_SECRET")
    ? "The authenticated runner endpoint and deployable worker process are configured; durable hosting and recovery evidence remain required."
    : "Set SHWAI_JOB_RUNNER_SECRET and deploy the npm run worker process for asynchronous workflows.",
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
const backupConfigured = ["BACKUP_PROVIDER", "BACKUP_BUCKET", "BACKUP_RETENTION_DAYS"].every(
  configured,
);
add(
  "backups",
  backupConfigured ? "WARNING" : "CONFIGURATION_REQUIRED",
  backupConfigured
    ? "Backup configuration names are present; automated backup success and restore evidence remain deployment requirements."
    : "Configure BACKUP_PROVIDER, BACKUP_BUCKET, and BACKUP_RETENTION_DAYS and retain a restore drill record.",
);
add(
  "security",
  "READY",
  "Security headers, CSRF, secure-cookie, request-size, and trusted-origin middleware are implemented in the application server.",
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
