import type { AuthContext } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import type { AiProviderResult } from "@/lib/ai/provider";
import {
  consumeSecurityRateLimit,
  getRequestSecurityContext,
  recordSecurityEvent,
  SecurityPolicyError,
} from "@/lib/security";

type SqlClient = ReturnType<typeof requireDatabase>;

export const AI_MAX_INPUT_CHARS = 12_000;
export const AI_MAX_OUTPUT_TOKENS = 2_400;
export const AI_REQUESTS_PER_MINUTE = 8;
export const AI_REQUESTS_PER_DAY_PER_SCHOOL = 2_000;
export const AI_DEFAULT_DAILY_TOKEN_BUDGET = 100_000;

export class AiPolicyError extends Error {
  code: string;
  constructor(message: string, code = "AI_POLICY_BLOCKED") {
    super(message);
    this.name = "AiPolicyError";
    this.code = code;
  }
}

export function requireAiRole(context: AuthContext, feature: "student" | "teacher" | "staff") {
  const allowed =
    feature === "student"
      ? ["student"]
      : feature === "teacher"
        ? ["teacher", "principal", "admin", "owner"]
        : ["staff", "teacher", "principal", "admin", "owner"];
  if (!allowed.includes(context.role))
    throw new AiPolicyError("This AI feature is not available for your role", "AI_ROLE_FORBIDDEN");
}

export function assertPromptSafe(input: string) {
  const normalized = input
    .normalize("NFKC")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 || (code >= 0x200b && code <= 0x200d) || code === 0xfeff
        ? " "
        : character;
    })
    .join("")
    .toLowerCase();
  const blockedPatterns = [
    /sexual.{0,40}(minor|child|student)/,
    /(minor|child|student).{0,40}sexual/,
    /how to (make|build|buy).{0,40}(weapon|explosive|poison)/,
    /instructions? for (self[- ]harm|suicide)/,
    /how to (hack|steal|bypass|break into)/,
    /ignore (all|any|the|previous|prior).{0,60}(instructions|rules|policy|safety)/,
    /(reveal|show|print|dump).{0,60}(system|developer|hidden).{0,60}(prompt|message|instruction)/,
    /(jailbreak|dan mode|developer mode|bypass).{0,40}(safety|guardrail|policy|restriction)/,
    /<\/?(system|developer|tool|function)>/,
  ];
  if (blockedPatterns.some((pattern) => pattern.test(normalized)))
    throw new AiPolicyError(
      "This request cannot be processed by the student-safe AI policy",
      "AI_SAFETY_BLOCKED",
    );
}

export function assertInputSize(input: string) {
  if (input.length > AI_MAX_INPUT_CHARS)
    throw new AiPolicyError(
      "AI request is too large. Reduce the supplied context and try again.",
      "AI_INPUT_TOO_LARGE",
    );
}

export function minimizeAcademicContext(input: {
  subject?: string;
  topic?: string;
  classLabel?: string;
  assignmentTitles?: string[];
  grades?: Array<{ subject: string; percentage: number }>;
}) {
  return {
    subject: input.subject?.slice(0, 120) ?? null,
    topic: input.topic?.slice(0, 180) ?? null,
    classLabel: input.classLabel?.slice(0, 80) ?? null,
    assignmentTitles: (input.assignmentTitles ?? [])
      .slice(0, 10)
      .map((title) => title.slice(0, 160)),
    grades: (input.grades ?? []).slice(0, 12).map((grade) => ({
      subject: grade.subject.slice(0, 120),
      percentage: Math.max(0, Math.min(100, grade.percentage)),
    })),
  };
}

export async function enforceAiUsage(
  sql: SqlClient,
  context: AuthContext,
  feature: string,
  inputChars: number,
) {
  const security = getRequestSecurityContext();
  try {
    await consumeSecurityRateLimit(sql, {
      scope: "ai_user_minute",
      subject: `${context.schoolId}:${context.userId}`,
      limit: AI_REQUESTS_PER_MINUTE,
      windowSeconds: 60,
    });
    await consumeSecurityRateLimit(sql, {
      scope: "ai_school_minute",
      subject: context.schoolId,
      limit: AI_REQUESTS_PER_MINUTE * 20,
      windowSeconds: 60,
    });
    if (security.ipHash) {
      await consumeSecurityRateLimit(sql, {
        scope: "ai_ip_minute",
        subject: security.ipHash,
        limit: 60,
        windowSeconds: 60,
      });
    }
  } catch (error) {
    if (error instanceof SecurityPolicyError) {
      await recordSecurityEvent(sql, {
        eventType: "ai_rate_limit",
        outcome: "blocked",
        severity: "warning",
        context,
        requestId: security.requestId,
        resource: feature,
        detail: { code: error.code, inputChars },
      });
      throw new AiPolicyError("AI request limit reached. Please try again later.", "AI_RATE_LIMIT");
    }
    throw error;
  }
  const recent =
    await sql`SELECT COUNT(*)::int AS count FROM hw_ai_usage WHERE school_id = ${context.schoolId} AND user_id = ${context.userId} AND created_at > NOW() - INTERVAL '1 minute'`;
  if (Number(recent[0]?.count ?? 0) >= AI_REQUESTS_PER_MINUTE)
    throw new AiPolicyError("AI request limit reached. Please try again later.", "AI_RATE_LIMIT");
  const daily =
    await sql`SELECT COUNT(*)::int AS count FROM hw_ai_usage WHERE school_id = ${context.schoolId} AND created_at > NOW() - INTERVAL '1 day'`;
  if (Number(daily[0]?.count ?? 0) >= AI_REQUESTS_PER_DAY_PER_SCHOOL)
    throw new AiPolicyError(
      "This school has reached its daily AI request limit.",
      "AI_DAILY_LIMIT",
    );
  const budgetRows = await sql<{ budget: number; used: number }[]>`
    SELECT
      COALESCE((SELECT daily_token_budget FROM hw_ai_settings WHERE school_id = ${context.schoolId}), ${AI_DEFAULT_DAILY_TOKEN_BUDGET})::int AS budget,
      COALESCE(SUM(output_tokens), 0)::int AS used
    FROM hw_ai_usage
    WHERE school_id = ${context.schoolId} AND created_at > NOW() - INTERVAL '1 day' AND status = 'success'`;
  const estimatedTokens = Math.ceil(inputChars / 4) + AI_MAX_OUTPUT_TOKENS;
  if (
    Number(budgetRows[0]?.used ?? 0) + estimatedTokens >
    Number(budgetRows[0]?.budget ?? AI_DEFAULT_DAILY_TOKEN_BUDGET)
  )
    throw new AiPolicyError(
      "This school has reached its daily AI token budget.",
      "AI_BUDGET_EXCEEDED",
    );
  if (inputChars > AI_MAX_INPUT_CHARS)
    throw new AiPolicyError(
      "AI request is too large. Reduce the supplied context and try again.",
      "AI_INPUT_TOO_LARGE",
    );
  void feature;
}

export async function recordAiUsage(
  sql: SqlClient,
  context: AuthContext,
  input: {
    feature: string;
    provider: string;
    model: string;
    requestId: string;
    inputChars: number;
    outputTokens?: number;
    status: "success" | "failure" | "blocked" | "configuration_required";
    errorCode?: string;
  },
) {
  await sql`INSERT INTO hw_ai_usage (school_id, user_id, role, feature, provider, model, request_id, input_chars, output_tokens, status, error_code) VALUES (${context.schoolId}, ${context.userId}, ${context.role}, ${input.feature}, ${input.provider}, ${input.model}, ${input.requestId}, ${input.inputChars}, ${input.outputTokens ?? null}, ${input.status}, ${input.errorCode ?? null})`;
}

export async function recordAiAudit(
  sql: SqlClient,
  context: AuthContext,
  feature: string,
  requestId: string,
  detail: string,
) {
  await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'ai_request', 'ai_feature', ${requestId}, ${`${feature}: ${detail}`.slice(0, 2000)})`;
}

export function normalizeAiError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "AI request failed. Please retry.";
}

export function providerMeta(result: AiProviderResult<unknown>) {
  return {
    provider: result.provider,
    model: result.model,
    requestId: result.requestId,
    outputTokens: result.outputTokens,
  };
}
