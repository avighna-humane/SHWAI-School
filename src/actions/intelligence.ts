import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { generateText, AiConfigurationError } from "@/lib/ai/provider";
import {
  assertInputSize,
  assertPromptSafe,
  enforceAiUsage,
  normalizeAiError,
  recordAiAudit,
  recordAiUsage,
} from "@/lib/ai/policy";
import {
  alertThreshold,
  confidenceFor,
  dataQuality,
  delta,
  directionFor,
  formatChange,
  recommendationFor,
  type AlertSeverity,
  type Confidence,
  type DataQuality,
  type IntelligenceCategory,
  type V4WindowDays,
  V4_RULES,
} from "@/lib/intelligence/policy";

const staffRoles = ["staff", "teacher", "principal", "admin", "owner"] as const;
const leadershipRoles = ["principal", "admin", "owner"] as const;
const windowSchema = z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]);
const scanInput = z.object({ windowDays: windowSchema.default(30) });
const alertIdInput = z.object({ id: z.string().min(1) });
const interventionInput = z.object({
  alertId: z.string().min(1),
  studentId: z.string().min(1),
  issue: z.string().trim().min(2).max(300),
  evidence: z.string().trim().min(2).max(3000),
  recommendedAction: z.string().trim().min(2).max(1000),
  ownerId: z.string().trim().max(160).optional(),
  priority: z.enum(["low", "medium", "high"]),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
const interventionUpdateInput = z.object({
  id: z.string().min(1),
  status: z.enum([
    "new",
    "reviewed",
    "assigned",
    "in_progress",
    "follow_up",
    "completed",
    "outcome_measured",
    "cancelled",
  ]),
  notes: z.string().trim().max(3000).optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
const followupInput = z.object({
  interventionId: z.string().min(1),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(1500).optional(),
});
const outcomeInput = z.object({
  interventionId: z.string().min(1),
  measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metricName: z.string().trim().min(2).max(160),
  beforeValue: z.number().finite().nullable().optional(),
  afterValue: z.number().finite().nullable().optional(),
  outcome: z.enum(["improved", "unchanged", "declined", "insufficient_data"]),
  notes: z.string().trim().max(2000).optional(),
});
const assistantInput = z.object({
  question: z.string().trim().min(2).max(3000),
  windowDays: windowSchema.default(30),
});

type StudentRow = { id: string; name: string };
type Metric = {
  current: number | null;
  baseline: number | null;
  currentCount: number;
  baselineCount: number;
};
type ScanSignal = {
  studentId: string;
  category: IntelligenceCategory;
  code: string;
  label: string;
  observedValue: number | null;
  baselineValue: number | null;
  deltaValue: number | null;
  direction: "up" | "down" | "flat" | "insufficient_data";
  dataQuality: DataQuality;
  evidenceCount: number;
  explanation: string;
  metadata: Record<string, unknown>;
};

type AlertRow = {
  id: string;
  student_id: string;
  student_name: string;
  alert_type: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  confidence: Confidence;
  confidence_reason: string;
  observation_start: string;
  observation_end: string;
  status: string;
  owner_id: string | null;
  created_at: string;
};

function dateOffset(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function alertSeverity(category: IntelligenceCategory, metric: Metric): AlertSeverity {
  if (category === "attendance" && (metric.current ?? 100) < 65) return "urgent";
  if (category === "academic" || category === "attendance") return "attention";
  return "attention";
}

function confidenceSummary(evidenceCount: number, quality: DataQuality) {
  return confidenceFor(evidenceCount, quality);
}

function makeSignal(
  studentId: string,
  category: IntelligenceCategory,
  code: string,
  label: string,
  metric: Metric,
  start: string,
  end: string,
  unit = "percentage points",
  metadata: Record<string, unknown> = {},
): ScanSignal {
  const quality = dataQuality(metric.currentCount);
  const change = delta(metric.current, metric.baseline);
  return {
    studentId,
    category,
    code,
    label,
    observedValue: metric.current,
    baselineValue: metric.baseline,
    deltaValue: change,
    direction: directionFor(change, quality),
    dataQuality: quality,
    evidenceCount: metric.currentCount,
    explanation:
      quality === "insufficient"
        ? `${label}: Not enough evidence in the ${start} to ${end} observation window.`
        : `${label}: current ${metric.current ?? "not available"}${unit ? ` ${unit}` : ""}; comparison period ${metric.baseline ?? "not available"}${unit ? ` ${unit}` : ""}; change ${formatChange(change, unit)}.`,
    metadata,
  };
}

async function studentAttendance(
  sql: ReturnType<typeof requireDatabase>,
  schoolId: string,
  studentId: string,
  start: string,
  end: string,
  baselineStart: string,
): Promise<Metric> {
  const rows = await sql<
    {
      current_total: number;
      current_positive: number;
      baseline_total: number;
      baseline_positive: number;
    }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE date >= ${start} AND date < ${end})::int AS current_total,
      COUNT(*) FILTER (WHERE date >= ${start} AND date < ${end} AND status IN ('present', 'late'))::int AS current_positive,
      COUNT(*) FILTER (WHERE date >= ${baselineStart} AND date < ${start})::int AS baseline_total,
      COUNT(*) FILTER (WHERE date >= ${baselineStart} AND date < ${start} AND status IN ('present', 'late'))::int AS baseline_positive
    FROM hw_attendance WHERE school_id = ${schoolId} AND student_id = ${studentId}`;
  const row = rows[0] ?? {
    current_total: 0,
    current_positive: 0,
    baseline_total: 0,
    baseline_positive: 0,
  };
  return {
    current: row.current_total ? (row.current_positive / row.current_total) * 100 : null,
    baseline: row.baseline_total ? (row.baseline_positive / row.baseline_total) * 100 : null,
    currentCount: Number(row.current_total),
    baselineCount: Number(row.baseline_total),
  };
}

async function studentHomework(
  sql: ReturnType<typeof requireDatabase>,
  schoolId: string,
  studentId: string,
  start: string,
  end: string,
  baselineStart: string,
): Promise<Metric> {
  const rows = await sql<
    {
      current_total: number;
      current_completed: number;
      baseline_total: number;
      baseline_completed: number;
    }[]
  >`
    SELECT
      COUNT(DISTINCT h.id) FILTER (WHERE h.due_date >= ${start} AND h.due_date < ${end})::int AS current_total,
      COUNT(DISTINCT s.homework_id) FILTER (WHERE h.due_date >= ${start} AND h.due_date < ${end} AND s.status IN ('submitted', 'graded'))::int AS current_completed,
      COUNT(DISTINCT h.id) FILTER (WHERE h.due_date >= ${baselineStart} AND h.due_date < ${start})::int AS baseline_total,
      COUNT(DISTINCT s.homework_id) FILTER (WHERE h.due_date >= ${baselineStart} AND h.due_date < ${start} AND s.status IN ('submitted', 'graded'))::int AS baseline_completed
    FROM hw_homework h
    JOIN hw_enrollments e ON e.school_id = ${schoolId} AND e.student_id = ${studentId} AND e.class_id = h.class_id AND e.status = 'active'
    LEFT JOIN hw_submissions s ON s.school_id = h.school_id AND s.homework_id = h.id AND s.student_id = ${studentId}
    WHERE h.school_id = ${schoolId} AND h.publication_status = 'published'`;
  const row = rows[0] ?? {
    current_total: 0,
    current_completed: 0,
    baseline_total: 0,
    baseline_completed: 0,
  };
  return {
    current: row.current_total ? (row.current_completed / row.current_total) * 100 : null,
    baseline: row.baseline_total ? (row.baseline_completed / row.baseline_total) * 100 : null,
    currentCount: Number(row.current_total),
    baselineCount: Number(row.baseline_total),
  };
}

async function studentAcademic(
  sql: ReturnType<typeof requireDatabase>,
  schoolId: string,
  studentId: string,
  start: string,
  end: string,
  baselineStart: string,
): Promise<Metric> {
  const rows = await sql<
    {
      current_average: number | null;
      current_count: number;
      baseline_average: number | null;
      baseline_count: number;
    }[]
  >`
    SELECT
      AVG(percentage) FILTER (WHERE created_at >= ${start}::date AND created_at < ${end}::date) AS current_average,
      COUNT(*) FILTER (WHERE created_at >= ${start}::date AND created_at < ${end}::date)::int AS current_count,
      AVG(percentage) FILTER (WHERE created_at >= ${baselineStart}::date AND created_at < ${start}::date) AS baseline_average,
      COUNT(*) FILTER (WHERE created_at >= ${baselineStart}::date AND created_at < ${start}::date)::int AS baseline_count
    FROM hw_grades WHERE school_id = ${schoolId} AND student_id = ${studentId} AND publication_status = 'published'`;
  const row = rows[0] ?? {
    current_average: null,
    current_count: 0,
    baseline_average: null,
    baseline_count: 0,
  };
  return {
    current: row.current_average === null ? null : Number(row.current_average),
    baseline: row.baseline_average === null ? null : Number(row.baseline_average),
    currentCount: Number(row.current_count),
    baselineCount: Number(row.baseline_count),
  };
}

async function studentEngagement(
  sql: ReturnType<typeof requireDatabase>,
  schoolId: string,
  studentId: string,
  start: string,
  end: string,
  baselineStart: string,
): Promise<Metric> {
  const rows = await sql<
    {
      current_count: number;
      baseline_count: number;
      current_success: number;
      baseline_success: number;
    }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${start}::date AND created_at < ${end}::date)::int AS current_count,
      COUNT(*) FILTER (WHERE created_at >= ${baselineStart}::date AND created_at < ${start}::date)::int AS baseline_count,
      COUNT(*) FILTER (WHERE created_at >= ${start}::date AND created_at < ${end}::date AND successful)::int AS current_success,
      COUNT(*) FILTER (WHERE created_at >= ${baselineStart}::date AND created_at < ${start}::date AND successful)::int AS baseline_success
    FROM hw_ai_learning_events WHERE school_id = ${schoolId} AND student_id = ${studentId}`;
  const row = rows[0] ?? {
    current_count: 0,
    baseline_count: 0,
    current_success: 0,
    baseline_success: 0,
  };
  return {
    current: Number(row.current_count),
    baseline: Number(row.baseline_count),
    currentCount: Number(row.current_count),
    baselineCount: Number(row.baseline_count),
  };
}

async function insertSignal(
  sql: ReturnType<typeof requireDatabase>,
  runId: string,
  schoolId: string,
  signal: ScanSignal,
  start: string,
  end: string,
) {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO hw_intelligence_signals (run_id, school_id, student_id, category, code, label, observed_value, baseline_value, delta_value, direction, observation_start, observation_end, evidence_count, data_quality, explanation, metadata)
    VALUES (${runId}, ${schoolId}, ${signal.studentId}, ${signal.category}, ${signal.code}, ${signal.label}, ${signal.observedValue}, ${signal.baselineValue}, ${signal.deltaValue}, ${signal.direction}, ${start}, ${end}, ${signal.evidenceCount}, ${signal.dataQuality}, ${signal.explanation}, ${JSON.stringify(signal.metadata)}::JSONB)
    RETURNING id`;
  return rows[0]!.id;
}

async function createAlert(
  sql: ReturnType<typeof requireDatabase>,
  context: AuthContext,
  runId: string,
  student: StudentRow,
  signal: ScanSignal,
  start: string,
  end: string,
  signalId: string,
) {
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} AND student_id = ${student.id} AND alert_type = ${signal.code} AND status NOT IN ('resolved', 'dismissed') AND created_at > NOW() - INTERVAL '30 days' LIMIT 1`;
  if (existing[0]) return { alertId: existing[0].id, created: false };
  const confidence = confidenceSummary(signal.evidenceCount, signal.dataQuality);
  const severity = alertSeverity(signal.category, {
    current: signal.observedValue,
    baseline: signal.baselineValue,
    currentCount: signal.evidenceCount,
    baselineCount: 0,
  });
  const rows = await sql<{ id: string }[]>`
    INSERT INTO hw_intelligence_alerts (school_id, student_id, run_id, alert_type, title, summary, severity, confidence, confidence_reason, observation_start, observation_end)
    VALUES (${context.schoolId}, ${student.id}, ${runId}, ${signal.code}, ${signal.label}, ${student.name}: ${signal.explanation}, ${severity}, ${confidence.confidence}, ${confidence.reason}, ${start}, ${end}) RETURNING id`;
  const alertId = rows[0]!.id;
  await sql`
    INSERT INTO hw_intelligence_evidence (school_id, alert_id, signal_id, label, value, detail, source_entity, source_id)
    VALUES (${context.schoolId}, ${alertId}, ${signalId}, ${signal.label}, ${formatChange(signal.deltaValue)}, ${signal.explanation}, ${signal.category}, ${signal.code})`;
  const recommendation = recommendationFor(signal.category, signal.label);
  await sql`
    INSERT INTO hw_intelligence_recommendations (school_id, alert_id, action, rationale, priority)
    VALUES (${context.schoolId}, ${alertId}, ${recommendation.action}, ${recommendation.rationale}, ${recommendation.priority})`;
  await sql`
    INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
    VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'intelligence_alert', ${alertId}, ${`Evidence-backed ${signal.code} alert created from ${signal.category} observations`})`;
  return { alertId, created: true };
}

export async function executeIntelligenceScan(
  context: AuthContext,
  data: { windowDays: V4WindowDays },
) {
  const sql = requireDatabase();
  const end = new Date().toISOString().slice(0, 10);
  const start = dateOffset(end, -data.windowDays);
  const baselineStart = dateOffset(start, -data.windowDays);
  const runs = await sql<{ id: string }[]>`
      INSERT INTO hw_intelligence_runs (school_id, window_days, status, triggered_by) VALUES (${context.schoolId}, ${data.windowDays}, 'running', ${context.userId}) RETURNING id`;
  const runId = runs[0]!.id;
  let recordsExamined = 0;
  let signalsCreated = 0;
  let alertsCreated = 0;
  try {
    const students = await sql<
      StudentRow[]
    >`SELECT id, name FROM hw_students WHERE school_id = ${context.schoolId} AND status = 'active' ORDER BY name`;
    for (const student of students) {
      const [attendance, homework, academic, engagement] = await Promise.all([
        studentAttendance(sql, context.schoolId, student.id, start, end, baselineStart),
        studentHomework(sql, context.schoolId, student.id, start, end, baselineStart),
        studentAcademic(sql, context.schoolId, student.id, start, end, baselineStart),
        studentEngagement(sql, context.schoolId, student.id, start, end, baselineStart),
      ]);
      recordsExamined +=
        attendance.currentCount +
        homework.currentCount +
        academic.currentCount +
        engagement.currentCount;
      const signals: ScanSignal[] = [
        makeSignal(
          student.id,
          "attendance",
          "attendance_decline",
          "Attendance trend",
          attendance,
          start,
          end,
          "%",
        ),
        makeSignal(
          student.id,
          "homework",
          "homework_completion_decline",
          "Homework completion trend",
          homework,
          start,
          end,
          "%",
        ),
        makeSignal(
          student.id,
          "academic",
          "academic_performance_decline",
          "Published academic performance trend",
          academic,
          start,
          end,
          "%",
        ),
        makeSignal(
          student.id,
          "engagement",
          "engagement_activity_decline",
          "Learning activity trend",
          engagement,
          start,
          end,
          "activities",
        ),
      ];
      for (const signal of signals) {
        if (signal.dataQuality === "insufficient") continue;
        if (!alertThreshold(signal.category, signal.observedValue, signal.deltaValue)) continue;
        const signalId = await insertSignal(sql, runId, context.schoolId, signal, start, end);
        signalsCreated += 1;
        const alert = await createAlert(sql, context, runId, student, signal, start, end, signalId);
        if (alert.created) alertsCreated += 1;
      }
      const conceptRows = await sql<
        { topic: string; attempts: number; successes: number; hints: number }[]
      >`
          SELECT topic, COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE successful)::int AS successes, COALESCE(SUM(hints_requested), 0)::int AS hints
          FROM hw_ai_learning_events WHERE school_id = ${context.schoolId} AND student_id = ${student.id} AND created_at >= ${start}::date AND created_at < ${end}::date GROUP BY topic`;
      for (const concept of conceptRows) {
        if (Number(concept.attempts) < V4_RULES.repeatedDifficultyAttempts) continue;
        const successRate = Number(concept.successes) / Math.max(1, Number(concept.attempts));
        if (
          successRate >= V4_RULES.repeatedDifficultySuccessRate &&
          Number(concept.hints) < Number(concept.attempts) * V4_RULES.repeatedDifficultyHints
        )
          continue;
        const signal = makeSignal(
          student.id,
          "concept",
          "repeated_concept_difficulty",
          `Repeated difficulty: ${concept.topic}`,
          {
            current: successRate * 100,
            baseline: null,
            currentCount: Number(concept.attempts),
            baselineCount: 0,
          },
          start,
          end,
          "%",
          {
            topic: concept.topic,
            attempts: concept.attempts,
            successes: concept.successes,
            hints: concept.hints,
          },
        );
        const signalId = await insertSignal(sql, runId, context.schoolId, signal, start, end);
        signalsCreated += 1;
        const alert = await createAlert(sql, context, runId, student, signal, start, end, signalId);
        if (alert.created) alertsCreated += 1;
      }
    }
    await sql`
        UPDATE hw_intelligence_runs SET status = 'completed', records_examined = ${recordsExamined}, signals_created = ${signalsCreated}, alerts_created = ${alertsCreated}, data_quality = ${JSON.stringify({ observationStart: start, observationEnd: end, windowDays: data.windowDays, studentsExamined: students.length })}::JSONB, completed_at = NOW() WHERE id = ${runId} AND school_id = ${context.schoolId}`;
    await sql`
        INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
        VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'run', 'intelligence_scan', ${runId}, ${`Completed ${data.windowDays}-day intelligence scan with ${signalsCreated} signals and ${alertsCreated} new alerts`})`;
    const escalatedCount = await processOverdueInterventionEscalations(context);
    return {
      runId,
      status: "completed" as const,
      recordsExamined,
      signalsCreated,
      alertsCreated,
      escalatedCount,
      observationStart: start,
      observationEnd: end,
    };
  } catch (error) {
    await sql`UPDATE hw_intelligence_runs SET status = 'failed', error_message = ${error instanceof Error ? error.message.slice(0, 1000) : "Intelligence scan failed"}, completed_at = NOW() WHERE id = ${runId} AND school_id = ${context.schoolId}`;
    throw error;
  }
}

export const runIntelligenceScan = createServerFn({ method: "POST" })
  .validator(scanInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    return executeIntelligenceScan(context, data);
  });

function assertStaff(context: AuthContext) {
  requireRole(context, staffRoles);
}

export const listIntelligenceAlerts = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student" || context.role === "parent") return [];
  assertStaff(context);
  return sql<AlertRow[]>`
    SELECT a.id, a.student_id, s.name AS student_name, a.alert_type, a.title, a.summary, a.severity, a.confidence, a.confidence_reason, a.observation_start, a.observation_end, a.status, a.owner_id, a.created_at
    FROM hw_intelligence_alerts a JOIN hw_students s ON s.id = a.student_id AND s.school_id = a.school_id
    WHERE a.school_id = ${context.schoolId} AND a.status NOT IN ('resolved', 'dismissed') ${teacherStudentScope(sql, context, "a")} ORDER BY CASE a.severity WHEN 'urgent' THEN 1 WHEN 'attention' THEN 2 ELSE 3 END, a.created_at DESC LIMIT 200`;
});

export const getIntelligenceAlertDetail = createServerFn({ method: "POST" })
  .validator(alertIdInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const alerts = await sql<AlertRow[]>`
      SELECT a.id, a.student_id, s.name AS student_name, a.alert_type, a.title, a.summary, a.severity, a.confidence, a.confidence_reason, a.observation_start, a.observation_end, a.status, a.owner_id, a.created_at
      FROM hw_intelligence_alerts a JOIN hw_students s ON s.id = a.student_id AND s.school_id = a.school_id
      WHERE a.id = ${data.id} AND a.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "a")} LIMIT 1`;
    if (!alerts[0]) throw new Error("Intelligence alert not found");
    const evidence =
      await sql`SELECT id, label, value, detail, source_entity, source_id FROM hw_intelligence_evidence WHERE alert_id = ${data.id} AND school_id = ${context.schoolId} ORDER BY created_at ASC`;
    const recommendations =
      await sql`SELECT id, action, rationale, priority, status FROM hw_intelligence_recommendations WHERE alert_id = ${data.id} AND school_id = ${context.schoolId} ORDER BY created_at ASC`;
    return { alert: alerts[0], evidence, recommendations };
  });

export const acknowledgeIntelligenceAlert = createServerFn({ method: "POST" })
  .validator(alertIdInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_intelligence_alerts AS a SET status = 'acknowledged', acknowledged_at = NOW() WHERE a.id = ${data.id} AND a.school_id = ${context.schoolId} AND a.status NOT IN ('resolved', 'dismissed') ${teacherStudentScope(sql, context, "a")} RETURNING a.id`;
    if (!rows[0]) throw new Error("Alert not found or already closed");
    await recordAiAudit(
      sql,
      context,
      "intelligence_alert_acknowledge",
      data.id,
      "Staff acknowledged an evidence-backed alert",
    );
    return { ok: true as const, status: "acknowledged" as const };
  });

export const listInterventions = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  assertStaff(context);
  const sql = requireDatabase();
  return sql`
    SELECT i.id, i.alert_id, i.student_id, s.name AS student_name, i.issue, i.evidence, i.recommended_action, i.owner_id, i.priority, i.status, i.notes, i.target_date, i.follow_up_date, i.created_at, i.updated_at
    FROM hw_interventions i JOIN hw_students s ON s.id = i.student_id AND s.school_id = i.school_id
    WHERE i.school_id = ${context.schoolId} AND i.status <> 'cancelled' ${teacherStudentScope(sql, context, "i")} ORDER BY CASE i.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.updated_at DESC LIMIT 200`;
});

export const createIntervention = createServerFn({ method: "POST" })
  .validator(interventionInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_intelligence_alerts a WHERE a.id = ${data.alertId} AND a.student_id = ${data.studentId} AND a.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "a")}`;
    if (!valid[0]) throw new Error("Alert and student do not belong to the current school");
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_interventions (school_id, alert_id, student_id, issue, evidence, recommended_action, owner_id, priority, target_date, follow_up_date, created_by)
      VALUES (${context.schoolId}, ${data.alertId}, ${data.studentId}, ${data.issue}, ${data.evidence}, ${data.recommendedAction}, ${data.ownerId ?? null}, ${data.priority}, ${data.targetDate ?? null}, ${data.followUpDate ?? null}, ${context.userId}) RETURNING id`;
    const id = rows[0]!.id;
    if (data.followUpDate)
      await sql`INSERT INTO hw_intervention_followups (school_id, intervention_id, scheduled_for, notes) VALUES (${context.schoolId}, ${id}, ${data.followUpDate}, 'Initial follow-up')`;
    await sql`UPDATE hw_intelligence_alerts SET status = 'assigned', owner_id = COALESCE(${data.ownerId ?? null}, owner_id) WHERE id = ${data.alertId} AND school_id = ${context.schoolId}`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'intervention', ${id}, 'Evidence-backed intervention created with human owner and follow-up boundary')`;
    return { id, status: "new" as const };
  });

export const updateIntervention = createServerFn({ method: "POST" })
  .validator(interventionUpdateInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const rows = await sql<{ id: string; alert_id: string | null }[]>`
      UPDATE hw_interventions AS i SET status = ${data.status}, notes = COALESCE(${data.notes ?? null}, i.notes), owner_id = CASE WHEN ${data.ownerId === undefined} THEN i.owner_id ELSE ${data.ownerId ?? null} END, target_date = CASE WHEN ${data.targetDate === undefined} THEN i.target_date ELSE ${data.targetDate ?? null} END, follow_up_date = CASE WHEN ${data.followUpDate === undefined} THEN i.follow_up_date ELSE ${data.followUpDate ?? null} END, updated_at = NOW()
      WHERE i.id = ${data.id} AND i.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "i")} RETURNING i.id, i.alert_id`;
    if (!rows[0]) throw new Error("Intervention not found");
    if (rows[0].alert_id && data.status === "completed")
      await sql`UPDATE hw_intelligence_alerts SET status = 'follow_up' WHERE id = ${rows[0].alert_id} AND school_id = ${context.schoolId}`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'intervention', ${data.id}, ${`Intervention status changed to ${data.status}`})`;
    return { ok: true as const, status: data.status };
  });

export const scheduleInterventionFollowup = createServerFn({ method: "POST" })
  .validator(followupInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_interventions i WHERE i.id = ${data.interventionId} AND i.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "i")}`;
    if (!valid[0]) throw new Error("Intervention not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_intervention_followups (school_id, intervention_id, scheduled_for, notes) SELECT ${context.schoolId}, ${data.interventionId}, ${data.scheduledFor}, ${data.notes ?? ""} WHERE EXISTS (SELECT 1 FROM hw_interventions i WHERE i.id = ${data.interventionId} AND i.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "i")}) RETURNING id`;
    await sql`UPDATE hw_interventions SET status = 'follow_up', follow_up_date = ${data.scheduledFor}, updated_at = NOW() WHERE id = ${data.interventionId} AND school_id = ${context.schoolId}`;
    return { id: rows[0]!.id, status: "upcoming" as const };
  });

export const recordInterventionOutcome = createServerFn({ method: "POST" })
  .validator(outcomeInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    assertStaff(context);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_interventions i WHERE i.id = ${data.interventionId} AND i.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "i")}`;
    if (!valid[0]) throw new Error("Intervention not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_intervention_outcomes (school_id, intervention_id, measured_at, metric_name, before_value, after_value, outcome, notes, created_by) SELECT ${context.schoolId}, ${data.interventionId}, ${data.measuredAt}, ${data.metricName}, ${data.beforeValue ?? null}, ${data.afterValue ?? null}, ${data.outcome}, ${data.notes ?? ""}, ${context.userId} WHERE EXISTS (SELECT 1 FROM hw_interventions i WHERE i.id = ${data.interventionId} AND i.school_id = ${context.schoolId} ${teacherStudentScope(sql, context, "i")}) RETURNING id`;
    await sql`UPDATE hw_interventions SET status = 'outcome_measured', updated_at = NOW() WHERE id = ${data.interventionId} AND school_id = ${context.schoolId}`;
    return { id: rows[0]!.id, outcome: data.outcome };
  });

export const getInterventionFollowups = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  assertStaff(context);
  const sql = requireDatabase();
  await sql`UPDATE hw_intervention_followups SET status = 'overdue' WHERE school_id = ${context.schoolId} AND status = 'upcoming' AND scheduled_for < CURRENT_DATE`;
  return sql`SELECT f.id, f.intervention_id, f.scheduled_for, f.status, f.notes, i.student_id, s.name AS student_name, i.issue FROM hw_intervention_followups f JOIN hw_interventions i ON i.id = f.intervention_id AND i.school_id = f.school_id JOIN hw_students s ON s.id = i.student_id AND s.school_id = i.school_id WHERE f.school_id = ${context.schoolId} AND f.status <> 'cancelled' ORDER BY f.scheduled_for ASC LIMIT 200`;
});

export const getIntelligenceOverview = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student") {
    const grades =
      await sql`SELECT subject, ROUND(AVG(percentage), 2) AS average_percentage, COUNT(*)::int AS records FROM hw_grades WHERE school_id = ${context.schoolId} AND student_id = ${context.userId} AND publication_status = 'published' GROUP BY subject ORDER BY average_percentage ASC`;
    const activity =
      await sql`SELECT COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE successful)::int AS successes, COALESCE(SUM(hints_requested), 0)::int AS hints FROM hw_ai_learning_events WHERE school_id = ${context.schoolId} AND student_id = ${context.userId}`;
    const attendance =
      await sql`SELECT COUNT(*)::int AS records, ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late')) / NULLIF(COUNT(*), 0), 2) AS attendance_percentage FROM hw_attendance WHERE school_id = ${context.schoolId} AND student_id = ${context.userId}`;
    const homework =
      await sql`SELECT COUNT(DISTINCT h.id)::int AS assigned, COUNT(DISTINCT s.homework_id) FILTER (WHERE s.status IN ('submitted', 'graded'))::int AS completed FROM hw_homework h LEFT JOIN hw_submissions s ON s.homework_id = h.id AND s.student_id = ${context.userId} WHERE h.school_id = ${context.schoolId} AND h.publication_status = 'published'`;
    const resources =
      await sql`SELECT id, content_type, subject, topic, title, updated_at FROM hw_ai_content WHERE school_id = ${context.schoolId} AND status = 'published' AND content_type IN ('study_notes', 'revision_sheet', 'flashcards', 'practice_questions') ORDER BY updated_at DESC LIMIT 12`;
    return {
      role: context.role,
      privacy: "student_observed_learning_only" as const,
      grades,
      activity,
      attendance,
      homework,
      resources,
      alerts: [],
      interventions: [],
    };
  }
  if (context.role === "parent") {
    const grades =
      await sql`SELECT g.subject, ROUND(AVG(g.percentage), 2) AS average_percentage, COUNT(*)::int AS records FROM hw_grades g JOIN hw_parent_students ps ON ps.student_id = g.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE g.school_id = ${context.schoolId} AND g.publication_status = 'published' GROUP BY g.subject ORDER BY average_percentage ASC`;
    const attendance =
      await sql`SELECT ps.student_id, s.name AS student_name, COUNT(a.*)::int AS records, ROUND(100.0 * COUNT(a.*) FILTER (WHERE a.status IN ('present', 'late')) / NULLIF(COUNT(a.*), 0), 2) AS attendance_percentage FROM hw_parent_students ps JOIN hw_students s ON s.id = ps.student_id AND s.school_id = ps.school_id LEFT JOIN hw_attendance a ON a.student_id = ps.student_id AND a.school_id = ps.school_id WHERE ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE GROUP BY ps.student_id, s.name ORDER BY s.name`;
    const resources =
      await sql`SELECT id, content_type, subject, topic, title, updated_at FROM hw_ai_content WHERE school_id = ${context.schoolId} AND status = 'published' AND content_type IN ('study_notes', 'revision_sheet', 'flashcards', 'practice_questions') ORDER BY updated_at DESC LIMIT 12`;
    const meetings =
      await sql`SELECT id, student_id, requested_start, status, reason FROM hw_parent_meeting_requests r JOIN hw_parents p ON p.id = r.parent_id AND p.school_id = r.school_id WHERE r.school_id = ${context.schoolId} AND p.user_id = ${context.userId} ORDER BY requested_start DESC LIMIT 20`;
    return {
      role: context.role,
      privacy: "linked_child_published_summary_only" as const,
      grades,
      attendance,
      resources,
      meetings,
      alerts: [],
      interventions: [],
    };
  }
  assertStaff(context);
  if (context.role === "teacher") {
    const studentIds = await getTeacherStudentIds(sql, context);
    if (!studentIds.length)
      return {
        role: context.role,
        privacy: "authorized_teacher_roster_summary" as const,
        alerts: [],
        signals: [],
        interventions: [],
        followups: [],
        latestRun: [],
        performance: [],
      };
    const alerts =
      await sql`SELECT severity, status, COUNT(*)::int AS count FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} AND student_id = ANY(${studentIds}) GROUP BY severity, status ORDER BY severity, status`;
    const signals =
      await sql`SELECT category, COUNT(*)::int AS count FROM hw_intelligence_signals WHERE school_id = ${context.schoolId} AND student_id = ANY(${studentIds}) AND created_at > NOW() - INTERVAL '30 days' GROUP BY category ORDER BY category`;
    const interventions =
      await sql`SELECT status, COUNT(*)::int AS count FROM hw_interventions WHERE school_id = ${context.schoolId} AND student_id = ANY(${studentIds}) GROUP BY status ORDER BY status`;
    const performance =
      await sql`SELECT subject, ROUND(AVG(percentage), 2) AS average_percentage, COUNT(*)::int AS records FROM hw_grades WHERE school_id = ${context.schoolId} AND student_id = ANY(${studentIds}) AND publication_status = 'published' GROUP BY subject ORDER BY average_percentage ASC`;
    return {
      role: context.role,
      privacy: "authorized_teacher_roster_summary" as const,
      alerts,
      signals,
      interventions,
      followups: [],
      latestRun: [],
      performance,
    };
  }
  const alerts =
    await sql`SELECT severity, status, COUNT(*)::int AS count FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} GROUP BY severity, status ORDER BY severity, status`;
  const signals =
    await sql`SELECT category, COUNT(*)::int AS count FROM hw_intelligence_signals WHERE school_id = ${context.schoolId} AND created_at > NOW() - INTERVAL '30 days' GROUP BY category ORDER BY category`;
  const interventions =
    await sql`SELECT status, COUNT(*)::int AS count FROM hw_interventions WHERE school_id = ${context.schoolId} GROUP BY status ORDER BY status`;
  const followups =
    await sql`SELECT status, COUNT(*)::int AS count FROM hw_intervention_followups WHERE school_id = ${context.schoolId} AND status <> 'cancelled' GROUP BY status ORDER BY status`;
  const latestRun =
    await sql`SELECT id, window_days, status, records_examined, signals_created, alerts_created, data_quality, started_at, completed_at FROM hw_intelligence_runs WHERE school_id = ${context.schoolId} ORDER BY started_at DESC LIMIT 1`;
  const performance =
    await sql`SELECT subject, ROUND(AVG(percentage), 2) AS average_percentage, COUNT(*)::int AS records FROM hw_grades WHERE school_id = ${context.schoolId} AND publication_status = 'published' GROUP BY subject ORDER BY average_percentage ASC`;
  const attendance =
    await sql`SELECT COUNT(*)::int AS records, ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late')) / NULLIF(COUNT(*), 0), 2) AS attendance_percentage, COUNT(*) FILTER (WHERE status = 'late')::int AS late_records FROM hw_attendance WHERE school_id = ${context.schoolId} AND date >= CURRENT_DATE - INTERVAL '30 days'`;
  const homework =
    await sql`SELECT COUNT(DISTINCT h.id)::int AS assigned, COUNT(DISTINCT s.homework_id) FILTER (WHERE s.status IN ('submitted', 'graded'))::int AS completed, COUNT(DISTINCT s.homework_id) FILTER (WHERE s.is_late = TRUE)::int AS late_submissions FROM hw_homework h LEFT JOIN hw_submissions s ON s.homework_id = h.id WHERE h.school_id = ${context.schoolId} AND h.publication_status = 'published' AND h.due_date >= CURRENT_DATE - INTERVAL '30 days'`;
  const aiUsage =
    await sql`SELECT COUNT(*)::int AS requests, COUNT(DISTINCT user_id)::int AS active_users, COUNT(*) FILTER (WHERE status <> 'success')::int AS failures, COUNT(DISTINCT feature)::int AS features FROM hw_ai_usage WHERE school_id = ${context.schoolId} AND created_at >= NOW() - INTERVAL '30 days'`;
  return {
    role: context.role,
    privacy: "authorized_staff_school_summary" as const,
    alerts,
    signals,
    interventions,
    followups,
    latestRun,
    performance,
    attendance,
    homework,
    aiUsage,
  };
});

export const askLeadershipAssistant = createServerFn({ method: "POST" })
  .validator(assistantInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    assertPromptSafe(data.question);
    assertInputSize(data.question);
    const sql = requireDatabase();
    await enforceAiUsage(sql, context, "v4_leadership_assistant", data.question.length);
    const alertCounts =
      await sql`SELECT severity, status, COUNT(*)::int AS count FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} GROUP BY severity, status`;
    const interventionCounts =
      await sql`SELECT status, COUNT(*)::int AS count FROM hw_interventions WHERE school_id = ${context.schoolId} GROUP BY status`;
    const performance =
      await sql`SELECT subject, ROUND(AVG(percentage), 2) AS average_percentage, COUNT(*)::int AS records FROM hw_grades WHERE school_id = ${context.schoolId} AND publication_status = 'published' GROUP BY subject ORDER BY average_percentage ASC`;
    const prompt = `Answer a school leadership question using only this aggregate, observed data. Do not invent records, student identities, causality, predictions, or actions. State when evidence is insufficient. Separate observations from interpretation and recommendations. Observation window: ${data.windowDays} days. Alert aggregates: ${JSON.stringify(alertCounts)}. Intervention aggregates: ${JSON.stringify(interventionCounts)}. Subject performance aggregates: ${JSON.stringify(performance)}. Question: ${data.question}`;
    const requestId = crypto.randomUUID();
    try {
      const result = await generateText({
        feature: "v4_leadership_assistant",
        messages: [
          {
            role: "system",
            content:
              "You are a cautious school intelligence assistant. Use only supplied aggregates. Never expose private student information or make high-stakes decisions.",
          },
          { role: "user", content: prompt },
        ],
        maxOutputTokens: 1200,
      });
      await recordAiUsage(sql, context, {
        feature: "v4_leadership_assistant",
        provider: result.provider,
        model: result.model,
        requestId: result.requestId,
        inputChars: prompt.length,
        outputTokens: result.outputTokens,
        status: "success",
      });
      await recordAiAudit(
        sql,
        context,
        "v4_leadership_assistant",
        result.requestId,
        "Leadership assistant answered from aggregate school intelligence only",
      );
      return {
        answer: result.data,
        aiGenerated: true as const,
        requestId: result.requestId,
        evidenceScope: "aggregate_school_intelligence" as const,
      };
    } catch (error) {
      await recordAiUsage(sql, context, {
        feature: "v4_leadership_assistant",
        provider: "unavailable",
        model: "unavailable",
        requestId,
        inputChars: prompt.length,
        status: error instanceof AiConfigurationError ? "configuration_required" : "failure",
        errorCode:
          error instanceof Error && "code" in error
            ? String((error as Error & { code?: string }).code)
            : "V4_ASSISTANT_FAILURE",
      });
      throw new Error(normalizeAiError(error));
    }
  });

export const getIntelligenceReport = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, leadershipRoles);
  const sql = requireDatabase();
  const latestRun =
    await sql`SELECT * FROM hw_intelligence_runs WHERE school_id = ${context.schoolId} ORDER BY started_at DESC LIMIT 1`;
  const alerts =
    await sql`SELECT severity, COUNT(*)::int AS count FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} AND status NOT IN ('resolved', 'dismissed') GROUP BY severity`;
  const interventions =
    await sql`SELECT status, COUNT(*)::int AS count FROM hw_interventions WHERE school_id = ${context.schoolId} GROUP BY status`;
  return {
    generatedFrom: latestRun[0] ?? null,
    alerts,
    interventions,
    noPrediction: true as const,
    evidenceRequired: true as const,
  };
});

const parentMeetingInput = z.object({
  studentId: z.string().min(1),
  reason: z.string().trim().min(2).max(1200),
  requestedStart: z.string().datetime(),
  requestedEnd: z.string().datetime(),
});
const parentAckInput = z.object({
  studentId: z.string().min(1),
  alertId: z.string().min(1).nullable().optional(),
  response: z.string().trim().max(1000).optional(),
});
const conceptInput = z.object({
  conceptKey: z.string().trim().min(2).max(120),
  label: z.string().trim().min(2).max(180),
  subject: z.string().trim().max(120).default(""),
});
const prerequisiteInput = z.object({
  prerequisiteConceptId: z.string().min(1),
  dependentConceptId: z.string().min(1),
});
const automationRuleInput = z.object({
  ruleKey: z.string().trim().min(2).max(120),
  triggerType: z.enum(["daily_attendance", "weekly_academic", "weekly_homework", "monthly_report"]),
  enabled: z.boolean(),
  recipientRole: z.enum(["teacher", "staff", "principal", "admin", "parent"]),
  actionType: z.enum(["scan", "notification", "report_summary", "revision_recommendation"]),
  configuration: z.record(z.unknown()).default({}),
});

export const acknowledgeParentIntelligence = createServerFn({ method: "POST" })
  .validator(parentAckInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["parent"]);
    const sql = requireDatabase();
    const valid = await sql`
      SELECT 1 FROM hw_parent_students ps
      JOIN hw_parents p ON p.id = ps.parent_id AND p.school_id = ps.school_id
      WHERE p.user_id = ${context.userId} AND ps.student_id = ${data.studentId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE`;
    if (!valid[0]) throw new Error("Student is not linked to this parent account");
    if (data.alertId) {
      const alert =
        await sql`SELECT 1 FROM hw_intelligence_alerts WHERE id = ${data.alertId} AND student_id = ${data.studentId} AND school_id = ${context.schoolId}`;
      if (!alert[0]) throw new Error("Alert is not available for this linked student");
    }
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_parent_intelligence_acknowledgements (school_id, parent_id, student_id, alert_id, viewed_at, acknowledged_at, response)
      SELECT ${context.schoolId}, p.id, ${data.studentId}, ${data.alertId ?? null}, NOW(), NOW(), ${data.response ?? ""}
      FROM hw_parents p WHERE p.user_id = ${context.userId} AND p.school_id = ${context.schoolId}
      ON CONFLICT (school_id, parent_id, student_id, alert_id) DO UPDATE SET viewed_at = NOW(), acknowledged_at = NOW(), response = EXCLUDED.response
      RETURNING id`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'acknowledge', 'parent_intelligence', ${rows[0]?.id ?? "parent-intelligence"}, 'Parent viewed and acknowledged an observed progress item; acknowledgement does not mean resolution')`;
    return { ok: true as const, acknowledged: true as const };
  });

export const requestParentMeeting = createServerFn({ method: "POST" })
  .validator(parentMeetingInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["parent"]);
    if (new Date(data.requestedEnd) <= new Date(data.requestedStart))
      throw new Error("Meeting end must be after the requested start");
    const sql = requireDatabase();
    const linked = await sql<{ parent_id: string }[]>`
      SELECT p.id AS parent_id FROM hw_parents p JOIN hw_parent_students ps ON ps.parent_id = p.id AND ps.school_id = p.school_id
      WHERE p.user_id = ${context.userId} AND p.school_id = ${context.schoolId} AND ps.student_id = ${data.studentId} AND ps.active = TRUE LIMIT 1`;
    if (!linked[0]) throw new Error("Student is not linked to this parent account");
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_parent_meeting_requests (school_id, parent_id, student_id, reason, requested_start, requested_end)
      VALUES (${context.schoolId}, ${linked[0].parent_id}, ${data.studentId}, ${data.reason}, ${data.requestedStart}, ${data.requestedEnd}) RETURNING id`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'parent_meeting_request', ${rows[0]!.id}, 'Parent meeting request created for staff review')`;
    return { id: rows[0]!.id, status: "requested" as const };
  });

export const listParentMeetingRequests = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "parent")
    return sql`
      SELECT r.id, r.student_id, s.name AS student_name, r.reason, r.requested_start, r.requested_end, r.status, r.participants, r.notes, r.created_at
      FROM hw_parent_meeting_requests r JOIN hw_students s ON s.id = r.student_id AND s.school_id = r.school_id JOIN hw_parents p ON p.id = r.parent_id AND p.school_id = r.school_id
      WHERE r.school_id = ${context.schoolId} AND p.user_id = ${context.userId} ORDER BY r.created_at DESC LIMIT 100`;
  assertStaff(context);
  return sql`
    SELECT r.id, r.student_id, s.name AS student_name, r.reason, r.requested_start, r.requested_end, r.status, r.participants, r.notes, r.created_at
    FROM hw_parent_meeting_requests r JOIN hw_students s ON s.id = r.student_id AND s.school_id = r.school_id
    WHERE r.school_id = ${context.schoolId} ORDER BY r.requested_start ASC LIMIT 200`;
});

export const createConceptNode = createServerFn({ method: "POST" })
  .validator(conceptInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "staff", "principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_intelligence_concepts (school_id, concept_key, label, subject, source_type, created_by)
      VALUES (${context.schoolId}, ${data.conceptKey}, ${data.label}, ${data.subject}, 'teacher_defined', ${context.userId})
      ON CONFLICT (school_id, concept_key) DO UPDATE SET label = EXCLUDED.label, subject = EXCLUDED.subject RETURNING id`;
    return { id: rows[0]!.id, conceptKey: data.conceptKey };
  });

export const createPrerequisiteRelationship = createServerFn({ method: "POST" })
  .validator(prerequisiteInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["staff", "principal", "admin", "owner"]);
    if (data.prerequisiteConceptId === data.dependentConceptId)
      throw new Error("A concept cannot be its own prerequisite");
    const sql = requireDatabase();
    const valid =
      await sql`SELECT COUNT(*)::int AS count FROM hw_intelligence_concepts WHERE school_id = ${context.schoolId} AND id IN (${data.prerequisiteConceptId}, ${data.dependentConceptId})`;
    if (Number(valid[0]?.count ?? 0) !== 2)
      throw new Error("Both concepts must belong to the current school");
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_intelligence_prerequisites (school_id, prerequisite_concept_id, dependent_concept_id, created_by)
      VALUES (${context.schoolId}, ${data.prerequisiteConceptId}, ${data.dependentConceptId}, ${context.userId}) ON CONFLICT DO NOTHING RETURNING id`;
    return { id: rows[0]?.id ?? null, created: Boolean(rows[0]) };
  });

export const listConceptMap = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, ["teacher", "staff", "principal", "admin", "owner"]);
  const sql = requireDatabase();
  return sql`
    SELECT c.id, c.concept_key, c.label, c.subject, p.id AS prerequisite_id, p.label AS prerequisite_label
    FROM hw_intelligence_concepts c LEFT JOIN hw_intelligence_prerequisites r ON r.dependent_concept_id = c.id AND r.school_id = c.school_id LEFT JOIN hw_intelligence_concepts p ON p.id = r.prerequisite_concept_id AND p.school_id = c.school_id
    WHERE c.school_id = ${context.schoolId} ORDER BY c.subject, c.label`;
});

export const listAutomationRules = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, leadershipRoles);
  const sql = requireDatabase();
  return sql`SELECT id, rule_key, trigger_type, enabled, recipient_role, action_type, configuration, created_by, updated_by, updated_at FROM hw_intelligence_automation_rules WHERE school_id = ${context.schoolId} ORDER BY rule_key`;
});

export const upsertAutomationRule = createServerFn({ method: "POST" })
  .validator(automationRuleInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      INSERT INTO hw_intelligence_automation_rules (school_id, rule_key, trigger_type, enabled, recipient_role, action_type, configuration, created_by, updated_by)
      VALUES (${context.schoolId}, ${data.ruleKey}, ${data.triggerType}, ${data.enabled}, ${data.recipientRole}, ${data.actionType}, ${JSON.stringify(data.configuration)}::JSONB, ${context.userId}, ${context.userId})
      ON CONFLICT (school_id, rule_key) DO UPDATE SET trigger_type = EXCLUDED.trigger_type, enabled = EXCLUDED.enabled, recipient_role = EXCLUDED.recipient_role, action_type = EXCLUDED.action_type, configuration = EXCLUDED.configuration, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      RETURNING id`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'update', 'intelligence_automation_rule', ${rows[0]!.id}, ${`Automation rule ${data.ruleKey} saved; enabled=${data.enabled}`})`;
    return { id: rows[0]!.id, enabled: data.enabled };
  });

export async function processOverdueInterventionEscalations(context: AuthContext) {
  const sql = requireDatabase();
  const overdue = await sql<
    {
      id: string;
      issue: string;
      student_id: string;
      student_name: string;
      owner_id: string | null;
    }[]
  >`
    SELECT i.id, i.issue, i.student_id, s.name AS student_name, i.owner_id
    FROM hw_interventions i
    JOIN hw_students s ON s.id = i.student_id AND s.school_id = i.school_id
    WHERE i.school_id = ${context.schoolId}
      AND i.follow_up_date < CURRENT_DATE
      AND i.status IN ('new', 'reviewed', 'assigned', 'in_progress', 'follow_up')
    ORDER BY i.follow_up_date ASC LIMIT 200`;
  let escalated = 0;
  for (const item of overdue) {
    const owner = item.owner_id
      ? await sql<{ role: AuthContext["role"] }[]>`
          SELECT role FROM hw_memberships WHERE user_id = ${item.owner_id} AND school_id = ${context.schoolId} AND active = TRUE LIMIT 1`
      : [];
    const ownerRole = owner[0]?.role ?? "teacher";
    const nextRoles: AuthContext["role"][] =
      ownerRole === "teacher"
        ? ["staff", "principal", "admin", "owner"]
        : ["principal", "admin", "owner"];
    const recipient = await sql<{ id: string }[]>`
      SELECT u.id FROM hw_users u JOIN hw_memberships m ON m.user_id = u.id AND m.school_id = ${context.schoolId} AND m.active = TRUE
      WHERE u.active = TRUE AND m.role = ANY(${nextRoles}) ORDER BY CASE m.role WHEN 'staff' THEN 1 WHEN 'principal' THEN 2 WHEN 'admin' THEN 3 ELSE 4 END LIMIT 1`;
    if (!recipient[0]) continue;
    const alreadySent = await sql`
      SELECT 1 FROM hw_notifications WHERE school_id = ${context.schoolId} AND recipient_id = ${recipient[0].id} AND source_entity = 'intervention_escalation' AND source_id = ${item.id} AND created_at > NOW() - INTERVAL '7 days' LIMIT 1`;
    if (alreadySent[0]) continue;
    await sql`
      INSERT INTO hw_notifications (school_id, recipient_id, title, body, severity, source_entity, source_id, created_by)
      VALUES (${context.schoolId}, ${recipient[0].id}, 'Overdue intervention follow-up', ${`${item.student_name}: ${item.issue} has an overdue follow-up and needs review.`}, 'warning', 'intervention_escalation', ${item.id}, ${context.userId})`;
    await sql`
      UPDATE hw_interventions SET status = 'follow_up', updated_at = NOW(), notes = CASE WHEN notes = '' THEN 'Escalated after overdue follow-up.' ELSE notes || E'\\nEscalated after overdue follow-up.' END WHERE id = ${item.id} AND school_id = ${context.schoolId}`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'escalate', 'intervention', ${item.id}, ${`Escalated overdue follow-up to the next authorized role after ${ownerRole}`})`;
    escalated += 1;
  }
  return escalated;
}

export async function executeAutomationRulesForSchool(context: AuthContext) {
  const sql = requireDatabase();
  const rules = await sql<
    {
      id: string;
      rule_key: string;
      trigger_type: "daily_attendance" | "weekly_academic" | "weekly_homework" | "monthly_report";
      recipient_role: AuthContext["role"];
      action_type: "scan" | "notification" | "report_summary" | "revision_recommendation";
      configuration: Record<string, unknown>;
    }[]
  >`
    SELECT id, rule_key, trigger_type, recipient_role, action_type, configuration
    FROM hw_intelligence_automation_rules WHERE school_id = ${context.schoolId} AND enabled = TRUE ORDER BY rule_key`;
  const results: Array<{
    ruleKey: string;
    status: "completed" | "skipped" | "failed";
    detail: string;
  }> = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const rule of rules) {
    const periodKey = rule.trigger_type === "monthly_report" ? today.slice(0, 7) : today;
    const idempotencyKey = `${rule.rule_key}:${periodKey}`;
    const run = await sql<{ id: string }[]>`
      INSERT INTO hw_intelligence_automation_runs (school_id, rule_id, trigger_type, status, idempotency_key, detail)
      VALUES (${context.schoolId}, ${rule.id}, ${rule.trigger_type}, 'running', ${idempotencyKey}, 'Scheduled automation started')
      ON CONFLICT (school_id, idempotency_key) DO NOTHING RETURNING id`;
    if (!run[0]) {
      results.push({
        ruleKey: rule.rule_key,
        status: "skipped",
        detail: "Idempotency key already processed for this period",
      });
      continue;
    }
    try {
      const configuredWindow = Number(rule.configuration?.windowDays);
      const windowDays = [7, 14, 30, 90].includes(configuredWindow)
        ? (configuredWindow as V4WindowDays)
        : rule.trigger_type === "daily_attendance"
          ? 7
          : rule.trigger_type === "monthly_report"
            ? 90
            : 30;
      if (rule.action_type === "scan") {
        const scan = await executeIntelligenceScan(context, { windowDays });
        await sql`UPDATE hw_intelligence_automation_runs SET status = 'completed', detail = ${`Scan completed with ${scan.signalsCreated} signals, ${scan.alertsCreated} alerts and ${scan.escalatedCount} escalations`} WHERE id = ${run[0].id} AND school_id = ${context.schoolId}`;
        results.push({
          ruleKey: rule.rule_key,
          status: "completed",
          detail: `Scan completed for ${windowDays} days`,
        });
        continue;
      }
      if (rule.action_type === "notification") {
        const recipients = await sql<{ id: string }[]>`
          SELECT u.id FROM hw_users u JOIN hw_memberships m ON m.user_id = u.id AND m.school_id = ${context.schoolId} AND m.active = TRUE
          WHERE u.active = TRUE AND m.role = ${rule.recipient_role} LIMIT 500`;
        const openAlerts = await sql<
          { id: string; student_id: string; title: string; summary: string }[]
        >`
          SELECT id, student_id, title, summary FROM hw_intelligence_alerts WHERE school_id = ${context.schoolId} AND status NOT IN ('resolved', 'dismissed') AND created_at >= CURRENT_DATE - ${windowDays} * INTERVAL '1 day' LIMIT 200`;
        let sent = 0;
        for (const alert of openAlerts) {
          for (const recipient of recipients) {
            const existing =
              await sql`SELECT 1 FROM hw_notifications WHERE school_id = ${context.schoolId} AND recipient_id = ${recipient.id} AND source_entity = 'intelligence_automation' AND source_id = ${alert.id} AND created_at >= CURRENT_DATE LIMIT 1`;
            if (existing[0]) continue;
            await sql`INSERT INTO hw_notifications (school_id, recipient_id, title, body, severity, source_entity, source_id, created_by) VALUES (${context.schoolId}, ${recipient.id}, ${alert.title}, ${alert.summary}, 'warning', 'intelligence_automation', ${alert.id}, ${context.userId})`;
            sent += 1;
          }
        }
        await sql`UPDATE hw_intelligence_automation_runs SET status = 'completed', recipient_count = ${sent}, detail = ${`Sent ${sent} deduplicated notifications`} WHERE id = ${run[0].id} AND school_id = ${context.schoolId}`;
        results.push({
          ruleKey: rule.rule_key,
          status: "completed",
          detail: `Sent ${sent} notifications`,
        });
        continue;
      }
      if (rule.action_type === "report_summary") {
        const report =
          await sql`INSERT INTO hw_intelligence_reports (school_id, report_type, observation_start, observation_end, content, created_by) VALUES (${context.schoolId}, ${rule.trigger_type}, CURRENT_DATE - ${windowDays} * INTERVAL '1 day', CURRENT_DATE, ${JSON.stringify({ generatedFrom: "persisted V1-V4 aggregates", windowDays, noPrediction: true })}::JSONB, ${context.userId}) RETURNING id`;
        await sql`UPDATE hw_intelligence_automation_runs SET status = 'completed', detail = ${`Report ${String(report[0]?.id ?? "")} generated from persisted aggregates`} WHERE id = ${run[0].id} AND school_id = ${context.schoolId}`;
        results.push({
          ruleKey: rule.rule_key,
          status: "completed",
          detail: "Report summary generated",
        });
        continue;
      }
      await sql`UPDATE hw_intelligence_automation_runs SET status = 'skipped', detail = 'Revision recommendation dispatch requires teacher review and is not automatically assigned' WHERE id = ${run[0].id} AND school_id = ${context.schoolId}`;
      results.push({
        ruleKey: rule.rule_key,
        status: "skipped",
        detail: "Teacher review required before recommendation dispatch",
      });
    } catch (error) {
      await sql`UPDATE hw_intelligence_automation_runs SET status = 'failed', detail = ${error instanceof Error ? error.message.slice(0, 1000) : "Automation failed"} WHERE id = ${run[0].id} AND school_id = ${context.schoolId}`;
      await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'failure', 'intelligence_automation', ${run[0].id}, 'Scheduled automation failed with a captured error')`;
      results.push({
        ruleKey: rule.rule_key,
        status: "failed",
        detail: error instanceof Error ? error.message : "Automation failed",
      });
    }
  }
  return results;
}

function teacherStudentScope(
  sql: ReturnType<typeof requireDatabase>,
  context: AuthContext,
  alias: "a" | "i",
) {
  if (context.role !== "teacher") return sql``;
  if (alias === "a")
    return sql`
      AND EXISTS (
        SELECT 1 FROM hw_teachers t
        JOIN hw_teacher_assignments ta ON ta.teacher_id = t.id AND ta.school_id = ${context.schoolId} AND ta.active = TRUE
        JOIN hw_enrollments e ON e.class_id = ta.class_id AND e.school_id = ${context.schoolId} AND e.student_id = a.student_id AND e.status = 'active'
        WHERE t.user_id = ${context.userId} AND t.school_id = ${context.schoolId} AND t.active = TRUE
      )`;
  return sql`
    AND EXISTS (
      SELECT 1 FROM hw_teachers t
      JOIN hw_teacher_assignments ta ON ta.teacher_id = t.id AND ta.school_id = ${context.schoolId} AND ta.active = TRUE
      JOIN hw_enrollments e ON e.class_id = ta.class_id AND e.school_id = ${context.schoolId} AND e.student_id = i.student_id AND e.status = 'active'
      WHERE t.user_id = ${context.userId} AND t.school_id = ${context.schoolId} AND t.active = TRUE
    )`;
}

async function getTeacherStudentIds(sql: ReturnType<typeof requireDatabase>, context: AuthContext) {
  const rows = await sql<{ student_id: string }[]>`
    SELECT DISTINCT e.student_id
    FROM hw_teachers t
    JOIN hw_teacher_assignments ta ON ta.teacher_id = t.id AND ta.school_id = ${context.schoolId} AND ta.active = TRUE
    JOIN hw_enrollments e ON e.class_id = ta.class_id AND e.school_id = ${context.schoolId} AND e.status = 'active'
    WHERE t.user_id = ${context.userId} AND t.school_id = ${context.schoolId} AND t.active = TRUE`;
  return rows.map((row) => row.student_id);
}
