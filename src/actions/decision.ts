import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { calculateScenario, calculateWorkload, type WorkloadTask } from "@/lib/v5/decision-engine";

const STAFF = ["teacher", "staff", "admin", "principal", "owner"] as const;
const LEADERSHIP = ["admin", "principal", "owner"] as const;
async function audit(
  context: AuthContext,
  action: string,
  entity: string,
  id: string,
  detail: string,
) {
  const sql = requireDatabase();
  await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, ${action}, ${entity}, ${id}, ${detail})`;
}

const scenarioSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).default(""),
  inputs: z.object({
    availableTeachers: z.number().int().nonnegative(),
    availableRooms: z.number().int().nonnegative(),
    roomCapacity: z.number().int().nonnegative(),
    groupSize: z.number().int().nonnegative(),
    addedSessions: z.number().int().nonnegative(),
    sessionMinutes: z.number().int().nonnegative(),
    assignedTeachers: z.number().int().nonnegative(),
    assignedRooms: z.number().int().nonnegative(),
  }),
  assumptions: z.record(z.unknown()).default({}),
  constraints: z.record(z.unknown()).default({}),
});
export const createScenario = createServerFn({ method: "POST" })
  .validator(scenarioSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const output = calculateScenario(data.inputs);
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_v5_scenarios (school_id, name, description, baseline, changed_variables, assumptions, constraints, outputs, warnings, tradeoffs, status, created_by) VALUES (${context.schoolId}, ${data.name}, ${data.description}, ${JSON.stringify({ availableTeachers: data.inputs.availableTeachers, availableRooms: data.inputs.availableRooms })}::JSONB, ${JSON.stringify(data.inputs)}::JSONB, ${JSON.stringify(data.assumptions)}::JSONB, ${JSON.stringify(data.constraints)}::JSONB, ${JSON.stringify(output.metrics)}::JSONB, ${JSON.stringify(output.warnings)}::JSONB, ${JSON.stringify({ items: output.tradeoffs, certainty: output.certainty })}::JSONB, 'calculated', ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "v5_scenario",
      rows[0]!.id,
      "Scenario calculated from explicit assumptions; no future performance prediction",
    );
    return { id: rows[0]!.id, output };
  });
export const listScenarios = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, LEADERSHIP);
  const sql = requireDatabase();
  return sql`SELECT id, name, description, assumptions, constraints, outputs, warnings, tradeoffs, status, created_by, created_at, updated_at FROM hw_v5_scenarios WHERE school_id = ${context.schoolId} ORDER BY updated_at DESC LIMIT 200`;
});
const decisionSchema = z.object({
  scenarioId: z.string().uuid(),
  selectedOption: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000).default(""),
});
export const recordScenarioDecision = createServerFn({ method: "POST" })
  .validator(decisionSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_v5_scenarios WHERE id = ${data.scenarioId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Scenario not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_v5_decision_history (school_id, scenario_id, selected_option, notes, created_by) VALUES (${context.schoolId}, ${data.scenarioId}, ${data.selectedOption}, ${data.notes}, ${context.userId}) RETURNING id`;
    await sql`UPDATE hw_v5_scenarios SET status = 'selected', updated_at = NOW() WHERE id = ${data.scenarioId} AND school_id = ${context.schoolId}`;
    await audit(
      context,
      "decision",
      "v5_scenario",
      data.scenarioId,
      `Decision recorded: ${data.selectedOption}`,
    );
    return { id: rows[0]!.id };
  });
export const listScenarioDecisions = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, LEADERSHIP);
  const sql = requireDatabase();
  return sql`SELECT d.id, d.scenario_id, s.name AS scenario_name, d.selected_option, d.decision_date, d.notes, d.created_by FROM hw_v5_decision_history d JOIN hw_v5_scenarios s ON s.id = d.scenario_id AND s.school_id = d.school_id WHERE d.school_id = ${context.schoolId} ORDER BY d.decision_date DESC LIMIT 200`;
});

const coverageSchema = z.object({
  unitId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COVERED", "PARTIALLY_COVERED", "REQUIRES_REVIEW"]),
  actualCompletion: z.string().date().nullable().optional(),
  assessmentsCompleted: z.number().int().nonnegative().default(0),
  conceptMastery: z.record(z.unknown()).default({}),
  evidence: z.string().trim().max(2000).default(""),
});
export const recordCurriculumCoverage = createServerFn({ method: "POST" })
  .validator(coverageSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    const unit =
      await sql`SELECT 1 FROM hw_curriculum_units WHERE id = ${data.unitId} AND school_id = ${context.schoolId}`;
    if (!unit[0]) throw new Error("Curriculum unit not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_curriculum_coverage (school_id, unit_id, actual_status, actual_completion, assessments_completed, concept_mastery, evidence, recorded_by) VALUES (${context.schoolId}, ${data.unitId}, ${data.status}, ${data.actualCompletion ?? null}, ${data.assessmentsCompleted}, ${JSON.stringify(data.conceptMastery)}::JSONB, ${data.evidence}, ${context.userId}) ON CONFLICT (school_id, unit_id) DO UPDATE SET actual_status = EXCLUDED.actual_status, actual_completion = EXCLUDED.actual_completion, assessments_completed = EXCLUDED.assessments_completed, concept_mastery = EXCLUDED.concept_mastery, evidence = EXCLUDED.evidence, recorded_by = EXCLUDED.recorded_by, recorded_at = NOW() RETURNING id`;
    await audit(
      context,
      "update",
      "curriculum_coverage",
      rows[0]!.id,
      `Curriculum coverage recorded as ${data.status}`,
    );
    return { id: rows[0]!.id, status: data.status };
  });
export const listCurriculumHealth = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  return sql`SELECT u.id, u.title, u.expected_start, u.expected_completion, u.priority, c.actual_status, c.actual_completion, c.assessments_completed, c.concept_mastery, c.evidence, CASE WHEN c.id IS NULL THEN 'NOT_STARTED' WHEN u.expected_completion < CURRENT_DATE AND c.actual_status NOT IN ('COVERED') THEN 'REQUIRES_REVIEW' ELSE c.actual_status END AS pacing_state FROM hw_curriculum_units u LEFT JOIN hw_curriculum_coverage c ON c.unit_id = u.id AND c.school_id = u.school_id WHERE u.school_id = ${context.schoolId} ORDER BY u.expected_completion NULLS LAST, u.title LIMIT 500`;
});
const debtSchema = z.object({
  unitId: z.string().uuid().nullable().optional(),
  category: z.enum([
    "not_taught",
    "poorly_understood",
    "prerequisite_gap",
    "misconception",
    "memorization_without_mastery",
    "over_covered",
    "under_covered",
  ]),
  evidence: z.record(z.unknown()).default({}),
  affectedGroup: z.string().trim().max(180).default(""),
  severity: z.enum(["info", "attention", "urgent"]),
  recommendedAction: z.string().trim().max(1200).default(""),
});
export const createLearningDebtRecord = createServerFn({ method: "POST" })
  .validator(debtSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_learning_debt_records (school_id, unit_id, category, evidence, affected_group, severity, recommended_action, created_by) VALUES (${context.schoolId}, ${data.unitId ?? null}, ${data.category}, ${JSON.stringify(data.evidence)}::JSONB, ${data.affectedGroup}, ${data.severity}, ${data.recommendedAction}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "learning_debt",
      rows[0]!.id,
      "Learning-debt record created from stated evidence",
    );
    return { id: rows[0]!.id };
  });
export const listLearningDebt = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  return sql`SELECT d.id, d.category, d.evidence, d.affected_group, d.severity, d.recommended_action, d.status, d.created_at, u.title AS unit_title FROM hw_learning_debt_records d LEFT JOIN hw_curriculum_units u ON u.id = d.unit_id AND u.school_id = d.school_id WHERE d.school_id = ${context.schoolId} AND d.status <> 'dismissed' ORDER BY CASE d.severity WHEN 'urgent' THEN 1 WHEN 'attention' THEN 2 ELSE 3 END, d.created_at DESC LIMIT 300`;
});

const experimentSchema = z.object({
  problem: z.string().trim().min(2).max(1200),
  hypothesis: z.string().trim().min(2).max(1200),
  intervention: z.string().trim().min(2).max(1200),
  targetGroup: z.string().trim().min(2).max(240),
  baselineMetric: z.string().trim().min(2).max(160),
  baselineValue: z.number().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  ownerId: z.string().min(1),
  startDate: z.string().date(),
  reviewDate: z.string().date(),
  comparisonMethod: z
    .enum(["baseline", "previous_period", "comparison_group"])
    .default("previous_period"),
});
export const createInterventionExperiment = createServerFn({ method: "POST" })
  .validator(experimentSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_intervention_experiments (school_id, problem, hypothesis, intervention, target_group, baseline_metric, baseline_value, target_value, owner_id, start_date, review_date, comparison_method, created_by) VALUES (${context.schoolId}, ${data.problem}, ${data.hypothesis}, ${data.intervention}, ${data.targetGroup}, ${data.baselineMetric}, ${data.baselineValue ?? null}, ${data.targetValue ?? null}, ${data.ownerId}, ${data.startDate}, ${data.reviewDate}, ${data.comparisonMethod}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "intervention_experiment",
      rows[0]!.id,
      "Experiment created with explicit observational/comparison method",
    );
    return { id: rows[0]!.id };
  });
const measurementSchema = z.object({
  experimentId: z.string().uuid(),
  measuredAt: z.string().date(),
  phase: z.enum(["baseline", "implementation", "follow_up", "outcome"]),
  metricValue: z.number().nullable().optional(),
  sampleSize: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(1200).default(""),
});
export const recordExperimentMeasurement = createServerFn({ method: "POST" })
  .validator(measurementSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_intervention_experiments WHERE id = ${data.experimentId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Experiment not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_experiment_measurements (school_id, experiment_id, measured_at, phase, metric_value, sample_size, notes, created_by) VALUES (${context.schoolId}, ${data.experimentId}, ${data.measuredAt}, ${data.phase}, ${data.metricValue ?? null}, ${data.sampleSize}, ${data.notes}, ${context.userId}) RETURNING id`;
    await sql`UPDATE hw_intervention_experiments SET status = CASE WHEN ${data.phase} = 'outcome' THEN 'completed' ELSE 'active' END, outcome = CASE WHEN ${data.phase} = 'outcome' THEN ${data.notes} ELSE outcome END WHERE id = ${data.experimentId} AND school_id = ${context.schoolId}`;
    await audit(
      context,
      "create",
      "experiment_measurement",
      rows[0]!.id,
      `Recorded ${data.phase} measurement; language remains observational`,
    );
    return { id: rows[0]!.id };
  });
export const listInterventionExperiments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, LEADERSHIP);
  const sql = requireDatabase();
  return sql`SELECT e.id, e.problem, e.hypothesis, e.intervention, e.target_group, e.baseline_metric, e.baseline_value, e.target_value, e.owner_id, e.start_date, e.review_date, e.comparison_method, e.status, e.outcome, e.evidence, COALESCE(json_agg(m ORDER BY m.measured_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS measurements FROM hw_intervention_experiments e LEFT JOIN hw_experiment_measurements m ON m.experiment_id = e.id AND m.school_id = e.school_id WHERE e.school_id = ${context.schoolId} GROUP BY e.id ORDER BY e.review_date LIMIT 200`;
});

const workloadSchema = z.object({
  teacherId: z.string().min(1),
  taskType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(2).max(180),
  estimatedMinutes: z.number().int().nonnegative(),
  actualMinutes: z.number().int().nonnegative().nullable().optional(),
  frequency: z.string().trim().max(80).default("once"),
  dueAt: z.string().datetime().nullable().optional(),
});
export const createWorkloadTask = createServerFn({ method: "POST" })
  .validator(workloadSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_workload_tasks (school_id, teacher_id, task_type, title, estimated_minutes, actual_minutes, frequency, due_at, created_by) VALUES (${context.schoolId}, ${data.teacherId}, ${data.taskType}, ${data.title}, ${data.estimatedMinutes}, ${data.actualMinutes ?? null}, ${data.frequency}, ${data.dueAt ?? null}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "workload_task",
      rows[0]!.id,
      "Workload task recorded from an explicit assignment",
    );
    return { id: rows[0]!.id };
  });
export const getWorkloadOverview = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  const threshold = 2400;
  const rows = await sql<
    {
      teacher_id: string;
      estimated_minutes: number;
      actual_minutes: number | null;
      task_type: string;
      status: string;
      due_at: string | null;
    }[]
  >`SELECT teacher_id, estimated_minutes, actual_minutes, task_type, status, due_at FROM hw_workload_tasks WHERE school_id = ${context.schoolId} AND status <> 'cancelled' ORDER BY teacher_id, due_at`;
  const byTeacher = new Map<string, WorkloadTask[]>();
  for (const row of rows) {
    const list = byTeacher.get(row.teacher_id) ?? [];
    list.push({
      estimatedMinutes: Number(row.estimated_minutes),
      actualMinutes: row.actual_minutes == null ? null : Number(row.actual_minutes),
      taskType: row.task_type,
      status: row.status,
      dueAt: row.due_at,
    });
    byTeacher.set(row.teacher_id, list);
  }
  return [...byTeacher.entries()].map(([teacherId, tasks]) => ({
    teacherId,
    ...calculateWorkload(tasks, threshold),
  }));
});

const contextSchema = z.object({
  studentId: z.string().min(1),
  category: z.string().trim().min(2).max(100),
  value: z.string().trim().min(2).max(1200),
  source: z.string().trim().min(2).max(240),
  consentStatus: z.enum(["not_required", "pending", "granted", "revoked"]),
  visibility: z.enum(["need_to_know", "student_support", "leadership_only"]),
  expiresAt: z.string().date().nullable().optional(),
});
export const createStudentContext = createServerFn({ method: "POST" })
  .validator(contextSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Student not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_student_context_records (school_id, student_id, category, value, source, consent_status, visibility, expires_at, created_by) VALUES (${context.schoolId}, ${data.studentId}, ${data.category}, ${data.value}, ${data.source}, ${data.consentStatus}, ${data.visibility}, ${data.expiresAt ?? null}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "student_context",
      rows[0]!.id,
      "Context record created from authorized human input; no sensitive inference",
    );
    return { id: rows[0]!.id };
  });
export const listStudentContext = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  await sql`UPDATE hw_student_context_records SET status = 'expired' WHERE school_id = ${context.schoolId} AND status = 'active' AND expires_at IS NOT NULL AND expires_at < CURRENT_DATE`;
  if (context.role === "student")
    return sql`SELECT id, category, value, source, consent_status, expires_at, status FROM hw_student_context_records WHERE school_id = ${context.schoolId} AND student_id = ${context.userId} AND status = 'active' AND visibility = 'student_support'`;
  requireRole(context, ["teacher", "staff", "admin", "principal", "owner"]);
  return sql`SELECT id, student_id, category, source, consent_status, visibility, expires_at, status, created_at FROM hw_student_context_records WHERE school_id = ${context.schoolId} AND status = 'active' AND visibility IN ('need_to_know','leadership_only') ORDER BY expires_at NULLS LAST LIMIT 300`;
});
const correctionSchema = z.object({
  contextId: z.string().uuid(),
  reason: z.string().trim().min(2).max(1000),
});
export const requestContextCorrection = createServerFn({ method: "POST" })
  .validator(correctionSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_student_context_records WHERE id = ${data.contextId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Context record not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_context_corrections (school_id, context_id, requested_by, reason) VALUES (${context.schoolId}, ${data.contextId}, ${context.userId}, ${data.reason}) RETURNING id`;
    await audit(
      context,
      "correction_request",
      "student_context",
      data.contextId,
      "Context correction requested",
    );
    return { id: rows[0]!.id };
  });

const helpProviderSchema = z.object({
  providerType: z.enum([
    "teacher_office_hours",
    "peer_tutor",
    "remedial_group",
    "library_resource",
    "verified_external",
    "pastoral_support",
  ]),
  name: z.string().trim().min(2).max(180),
  subjects: z.array(z.string().trim().min(1)).max(30),
  languages: z.array(z.string().trim().min(1)).max(20),
  ageMin: z.number().int().min(0).nullable().optional(),
  ageMax: z.number().int().min(0).nullable().optional(),
});
export const createHelpProvider = createServerFn({ method: "POST" })
  .validator(helpProviderSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_help_providers (school_id, provider_type, name, subjects, languages, age_min, age_max, approved, created_by) VALUES (${context.schoolId}, ${data.providerType}, ${data.name}, ${data.subjects}, ${data.languages}, ${data.ageMin ?? null}, ${data.ageMax ?? null}, FALSE, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "help_provider",
      rows[0]!.id,
      "Support provider created pending approval",
    );
    return { id: rows[0]!.id, approved: false };
  });
const helpRequestSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(180),
  language: z.string().trim().max(80).default(""),
});
export const createHelpRequest = createServerFn({ method: "POST" })
  .validator(helpRequestSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student", "parent", "teacher", "staff", "admin", "principal", "owner"]);
    const sql = requireDatabase();
    const student =
      context.role === "student"
        ? await sql<
            { id: string }[]
          >`SELECT id FROM hw_students WHERE user_id = ${context.userId} AND school_id = ${context.schoolId} LIMIT 1`
        : [];
    const studentId = student[0]?.id;
    if (context.role === "student" && !studentId) throw new Error("Student profile is not linked");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_help_requests (school_id, student_id, subject, topic, language, created_by) VALUES (${context.schoolId}, ${studentId ?? context.userId}, ${data.subject}, ${data.topic}, ${data.language}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "help_request",
      rows[0]!.id,
      "Help request created without sensitive matching factors",
    );
    return { id: rows[0]!.id };
  });
export const listHelpRequests = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student")
    return sql`SELECT id, subject, topic, language, status, requested_at FROM hw_help_requests WHERE school_id = ${context.schoolId} AND created_by = ${context.userId} ORDER BY requested_at DESC`;
  requireRole(context, STAFF);
  return sql`SELECT id, student_id, subject, topic, language, status, requested_at FROM hw_help_requests WHERE school_id = ${context.schoolId} ORDER BY requested_at DESC LIMIT 300`;
});
const helpMatchSchema = z.object({
  requestId: z.string().uuid(),
  providerId: z.string().uuid(),
  safetyNotes: z.string().trim().max(1200).default(""),
});
export const createHelpMatch = createServerFn({ method: "POST" })
  .validator(helpMatchSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_help_requests r JOIN hw_help_providers p ON p.school_id = r.school_id WHERE r.id = ${data.requestId} AND r.school_id = ${context.schoolId} AND p.id = ${data.providerId} AND p.approved = TRUE`;
    if (!valid[0]) throw new Error("Request or approved provider not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_help_matches (school_id, request_id, provider_id, safety_notes, status, approved_by) VALUES (${context.schoolId}, ${data.requestId}, ${data.providerId}, ${data.safetyNotes}, 'approved', ${context.userId}) RETURNING id`;
    await sql`UPDATE hw_help_requests SET status = 'matched' WHERE id = ${data.requestId} AND school_id = ${context.schoolId}`;
    await audit(
      context,
      "create",
      "help_match",
      rows[0]!.id,
      "Help match approved with safety boundary",
    );
    return { id: rows[0]!.id, status: "approved" as const };
  });

export const refreshLearningDebt = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  const units = await sql<{ id: string; title: string; expected_completion: string | null }[]>`
    SELECT u.id, u.title, u.expected_completion
    FROM hw_curriculum_units u
    LEFT JOIN hw_curriculum_coverage c ON c.unit_id = u.id AND c.school_id = u.school_id
    WHERE u.school_id = ${context.schoolId} AND (c.id IS NULL OR (u.expected_completion < CURRENT_DATE AND c.actual_status NOT IN ('COVERED')))
    LIMIT 500`;
  let created = 0;
  for (const unit of units) {
    const existing =
      await sql`SELECT 1 FROM hw_learning_debt_records WHERE school_id = ${context.schoolId} AND unit_id = ${unit.id} AND category = 'not_taught' AND status = 'open' LIMIT 1`;
    if (existing[0]) continue;
    await sql`INSERT INTO hw_learning_debt_records (school_id, unit_id, category, evidence, affected_group, severity, recommended_action, created_by) VALUES (${context.schoolId}, ${unit.id}, 'not_taught', ${JSON.stringify({ expectedCompletion: unit.expected_completion, source: "curriculum_coverage" })}::JSONB, 'Unit coverage', 'attention', 'Record explicit teaching coverage and review pacing before changing the curriculum.', ${context.userId})`;
    created += 1;
  }
  const conceptAlerts = await sql<
    { id: string; student_id: string; title: string; summary: string }[]
  >`
    SELECT id, student_id, title, summary FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} AND alert_type = 'repeated_concept_difficulty' AND status NOT IN ('resolved','dismissed') AND created_at >= CURRENT_DATE - INTERVAL '30 days' LIMIT 300`;
  for (const alert of conceptAlerts) {
    const existing =
      await sql`SELECT 1 FROM hw_learning_debt_records WHERE school_id = ${context.schoolId} AND category = 'misconception' AND evidence->>'alertId' = ${alert.id} AND status = 'open' LIMIT 1`;
    if (existing[0]) continue;
    await sql`INSERT INTO hw_learning_debt_records (school_id, category, evidence, affected_group, severity, recommended_action, created_by) VALUES (${context.schoolId}, 'misconception', ${JSON.stringify({ alertId: alert.id, studentId: alert.student_id, title: alert.title, summary: alert.summary, source: "v4_intelligence_alert" })}::JSONB, 'Observed concept difficulty group', 'attention', 'Review the supporting concept evidence and plan targeted revision; do not infer causation.', ${context.userId})`;
    created += 1;
  }
  await audit(
    context,
    "refresh",
    "learning_debt",
    context.schoolId,
    `Learning-debt refresh created ${created} evidence-backed records`,
  );
  return { created, source: "explicit_curriculum_coverage_and_v4_alerts" as const };
});

import { generateText } from "@/lib/ai/provider";

const scenarioExplanationSchema = z.object({
  scenarioId: z.string().uuid(),
  question: z
    .string()
    .trim()
    .max(800)
    .default("Explain the operational trade-offs in plain language."),
});
export const explainScenario = createServerFn({ method: "POST" })
  .validator(scenarioExplanationSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      {
        name: string;
        outputs: unknown;
        warnings: unknown;
        tradeoffs: unknown;
        assumptions: unknown;
        constraints: unknown;
      }[]
    >`SELECT name, outputs, warnings, tradeoffs, assumptions, constraints FROM hw_v5_scenarios WHERE id = ${data.scenarioId} AND school_id = ${context.schoolId}`;
    const scenario = rows[0];
    if (!scenario) throw new Error("Scenario not found");
    const result = await generateText({
      feature: "v5-scenario-explanation",
      messages: [
        {
          role: "system",
          content:
            "Explain only the supplied scenario calculations. Do not invent facts, hidden calculations, causal claims, future predictions, or academic outcomes. State when data is unknown. Keep the explanation editable and concise.",
        },
        { role: "user", content: JSON.stringify({ question: data.question, scenario }) },
      ],
      maxOutputTokens: 700,
    });
    await audit(
      context,
      "ai_explanation",
      "v5_scenario",
      data.scenarioId,
      `Scenario explanation generated by ${result.model}; numbers were supplied by the server-side calculator`,
    );
    return {
      text: result.data,
      provider: result.provider,
      model: result.model,
      requestId: result.requestId,
    };
  });
