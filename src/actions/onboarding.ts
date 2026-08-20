import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";

const LEADERSHIP = ["admin", "principal", "owner"] as const;
const onboardingStep = z.enum([
  "school_profile",
  "academic_setup",
  "people_setup",
  "data_import",
  "operational_ready",
]);
const identityPolicySchema = z
  .object({
    requireEmailVerification: z.boolean(),
    requireMfaForPrivileged: z.boolean(),
    mfaProvider: z.enum(["totp", "configuration_required"]),
  })
  .refine(
    (value) => !value.requireMfaForPrivileged || value.mfaProvider === "totp",
    "TOTP must be selected when privileged MFA is required",
  );

const schoolSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(1).max(80),
  country: z.string().trim().length(2),
  currency: z.string().trim().length(3),
  gradingSystem: z.enum(["percentage", "gpa", "letter", "custom"]),
  curriculum: z.string().trim().max(120).default(""),
  language: z.string().trim().min(2).max(12),
});

export const getIdentityPolicy = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, LEADERSHIP);
  const sql = requireDatabase();
  const rows = await sql<
    {
      require_email_verification: boolean;
      require_mfa_for_privileged: boolean;
      mfa_provider: string;
    }[]
  >`
    SELECT require_email_verification, require_mfa_for_privileged, mfa_provider FROM hw_identity_policies WHERE school_id = ${context.schoolId}`;
  return (
    rows[0] ?? {
      require_email_verification: true,
      require_mfa_for_privileged: false,
      mfa_provider: "configuration_required",
    }
  );
});

export const updateIdentityPolicy = createServerFn({ method: "POST" })
  .validator(identityPolicySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    const sql = requireDatabase();
    if (data.requireMfaForPrivileged) {
      const unenrolled = await sql`
        SELECT u.id FROM hw_users u
        JOIN hw_memberships m ON m.user_id = u.id AND m.school_id = ${context.schoolId} AND m.active = TRUE
        LEFT JOIN hw_user_mfa mfa ON mfa.user_id = u.id AND mfa.enabled = TRUE
        WHERE m.role IN ('owner', 'principal', 'admin') AND mfa.user_id IS NULL
        LIMIT 1`;
      if (unenrolled[0])
        throw new Error(
          "Every owner, principal, and administrator must enroll in TOTP before privileged MFA can be required",
        );
    }
    await sql`
      INSERT INTO hw_identity_policies (school_id, require_email_verification, require_mfa_for_privileged, mfa_provider, updated_by)
      VALUES (${context.schoolId}, ${data.requireEmailVerification}, ${data.requireMfaForPrivileged}, ${data.mfaProvider}, ${context.userId})
      ON CONFLICT (school_id) DO UPDATE SET require_email_verification = EXCLUDED.require_email_verification,
        require_mfa_for_privileged = EXCLUDED.require_mfa_for_privileged, mfa_provider = EXCLUDED.mfa_provider,
        updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'identity_policy', ${context.schoolId}, 'Identity policy updated')`;
    return {
      ok: true as const,
      mfaState: data.requireMfaForPrivileged ? "REQUIRED_TOTP" : "OPTIONAL",
    };
  });

export const getOnboardingState = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  requireRole(context, LEADERSHIP);
  const rows = await sql<
    {
      id: string;
      name: string;
      slug: string;
      timezone: string;
      country: string;
      currency: string;
      grading_system: string;
      curriculum: string;
      language: string;
      onboarding_status: string;
      onboarding_step: string;
      onboarding_completed_at: string | null;
      plan: string;
      subscription_status: string;
      academic_years: number;
      classes: number;
      sections: number;
      subjects: number;
      students: number;
      teachers: number;
      parents: number;
      pending_invitations: number;
    }[]
  >`
    SELECT s.id, s.name, s.slug, s.timezone, s.country, s.currency, s.grading_system, s.curriculum,
           s.language, s.onboarding_status, s.onboarding_step, s.onboarding_completed_at,
           s.plan, s.subscription_status,
           (SELECT COUNT(*)::int FROM hw_academic_years WHERE school_id = s.id) AS academic_years,
           (SELECT COUNT(*)::int FROM hw_classes WHERE school_id = s.id AND active = TRUE) AS classes,
           (SELECT COUNT(*)::int FROM hw_sections WHERE school_id = s.id AND active = TRUE) AS sections,
           (SELECT COUNT(*)::int FROM hw_subjects WHERE school_id = s.id AND active = TRUE) AS subjects,
           (SELECT COUNT(*)::int FROM hw_students WHERE school_id = s.id AND status = 'active') AS students,
           (SELECT COUNT(*)::int FROM hw_teachers WHERE school_id = s.id AND active = TRUE) AS teachers,
           (SELECT COUNT(*)::int FROM hw_parents WHERE school_id = s.id AND active = TRUE) AS parents,
           (SELECT COUNT(*)::int FROM hw_invitations WHERE school_id = s.id AND status = 'pending' AND expires_at > NOW()) AS pending_invitations
    FROM hw_schools s WHERE s.id = ${context.schoolId} AND s.active = TRUE LIMIT 1`;
  if (!rows[0]) throw new Error("School not found");
  return rows[0];
});

export const updateSchoolSettings = createServerFn({ method: "POST" })
  .validator(schoolSettingsSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      UPDATE hw_schools SET name = ${data.name}, timezone = ${data.timezone}, country = ${data.country.toUpperCase()},
        currency = ${data.currency.toUpperCase()}, grading_system = ${data.gradingSystem}, curriculum = ${data.curriculum},
        language = ${data.language}, onboarding_step = CASE WHEN onboarding_step = 'school_profile' THEN 'academic_setup' ELSE onboarding_step END
      WHERE id = ${context.schoolId} AND active = TRUE RETURNING id`;
    if (!rows[0]) throw new Error("School not found or not authorized");
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'school_settings', ${context.schoolId}, 'School settings updated')`;
    return { ok: true as const };
  });

export const completeOnboardingStep = createServerFn({ method: "POST" })
  .validator(z.object({ step: onboardingStep }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const state = await sql<
      {
        onboarding_step: string;
        academic_years: number;
        classes: number;
        sections: number;
        subjects: number;
      }[]
    >`
      SELECT s.onboarding_step,
        (SELECT COUNT(*)::int FROM hw_academic_years WHERE school_id = s.id) AS academic_years,
        (SELECT COUNT(*)::int FROM hw_classes WHERE school_id = s.id AND active = TRUE) AS classes,
        (SELECT COUNT(*)::int FROM hw_sections WHERE school_id = s.id AND active = TRUE) AS sections,
        (SELECT COUNT(*)::int FROM hw_subjects WHERE school_id = s.id AND active = TRUE) AS subjects
      FROM hw_schools s WHERE s.id = ${context.schoolId} AND s.active = TRUE`;
    if (!state[0]) throw new Error("School not found");
    if (
      data.step === "academic_setup" &&
      (!state[0].academic_years || !state[0].classes || !state[0].sections || !state[0].subjects)
    ) {
      throw new Error(
        "Create an academic year, class, section, and subject before completing academic setup",
      );
    }
    const nextStep =
      data.step === "school_profile"
        ? "academic_setup"
        : data.step === "academic_setup"
          ? "people_setup"
          : data.step === "people_setup"
            ? "data_import"
            : data.step === "data_import"
              ? "operational_ready"
              : "operational_ready";
    const completed = data.step === "operational_ready";
    await sql`
      UPDATE hw_schools SET onboarding_step = ${nextStep}, onboarding_status = ${completed ? "complete" : "in_progress"}, onboarding_completed_at = ${completed ? new Date().toISOString() : null}
      WHERE id = ${context.schoolId}`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'onboarding', ${context.schoolId}, ${`Onboarding step completed: ${data.step}`})`;
    return { ok: true as const, nextStep, completed };
  });
