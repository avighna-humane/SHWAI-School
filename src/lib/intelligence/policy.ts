export type IntelligenceCategory =
  "attendance" | "academic" | "homework" | "engagement" | "concept";
export type DataQuality = "good" | "limited" | "insufficient";
export type SignalDirection = "up" | "down" | "flat" | "insufficient_data";
export type AlertSeverity = "info" | "attention" | "urgent";
export type Confidence = "high" | "medium" | "low" | "insufficient_data";

export const V4_WINDOWS = [7, 14, 30, 90] as const;
export type V4WindowDays = (typeof V4_WINDOWS)[number];

export const V4_RULES = {
  attendanceMinimumPct: 75,
  attendanceDeclinePct: 5,
  homeworkDeclinePct: 10,
  academicDeclinePct: 10,
  engagementDeclinePct: 50,
  repeatedDifficultyAttempts: 3,
  repeatedDifficultySuccessRate: 0.5,
  repeatedDifficultyHints: 3,
  minimumRecordsForGoodQuality: 6,
  minimumRecordsForLimitedQuality: 2,
} as const;

export function dataQuality(recordCount: number): DataQuality {
  if (recordCount >= V4_RULES.minimumRecordsForGoodQuality) return "good";
  if (recordCount >= V4_RULES.minimumRecordsForLimitedQuality) return "limited";
  return "insufficient";
}

export function safePercent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : null;
}

export function delta(current: number | null, baseline: number | null) {
  if (current === null || baseline === null) return null;
  return Math.round((current - baseline) * 100) / 100;
}

export function directionFor(change: number | null, quality: DataQuality): SignalDirection {
  if (quality === "insufficient" || change === null) return "insufficient_data";
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "flat";
}

export function confidenceFor(
  evidenceCount: number,
  quality: DataQuality,
): { confidence: Confidence; reason: string } {
  if (quality === "insufficient")
    return {
      confidence: "insufficient_data",
      reason: "Not enough records in the observation window to support a conclusion.",
    };
  if (quality === "good")
    return {
      confidence: "high",
      reason:
        "Multiple observations are available across the observation window and comparison period.",
    };
  return {
    confidence: "medium",
    reason: "Some observations are available, but the evidence set is limited.",
  };
}

export function alertThreshold(
  category: IntelligenceCategory,
  observed: number | null,
  change: number | null,
) {
  if (observed === null && change === null) return false;
  if (category === "attendance")
    return (
      (observed !== null && observed < V4_RULES.attendanceMinimumPct) ||
      (change !== null && change <= -V4_RULES.attendanceDeclinePct)
    );
  if (category === "homework") return change !== null && change <= -V4_RULES.homeworkDeclinePct;
  if (category === "academic") return change !== null && change <= -V4_RULES.academicDeclinePct;
  if (category === "engagement") return change !== null && change <= -V4_RULES.engagementDeclinePct;
  return true;
}

export function recommendationFor(category: IntelligenceCategory, label: string) {
  if (category === "attendance")
    return {
      action: "Review attendance circumstances and schedule a teacher or parent follow-up.",
      priority: "high" as const,
      rationale: `${label} is based on observed attendance records; check approved leave and recent changes before acting.`,
    };
  if (category === "homework")
    return {
      action: "Identify missed assignments and offer a teacher-approved catch-up plan.",
      priority: "medium" as const,
      rationale: `${label} is based on submitted homework records in the observation and comparison windows.`,
    };
  if (category === "academic")
    return {
      action:
        "Review recent assessment mistakes and plan targeted revision with the subject teacher.",
      priority: "high" as const,
      rationale: `${label} is based on published grade records and does not claim future performance.`,
    };
  if (category === "engagement")
    return {
      action: "Check the learner’s current study plan and offer a small, achievable next activity.",
      priority: "medium" as const,
      rationale: `${label} is based on persisted practice and learning-event activity.`,
    };
  return {
    action:
      "Review the concept with targeted practice or a teacher explanation, then retest the skill.",
    priority: "medium" as const,
    rationale: `${label} is based on repeated attempts, success rates, and hint requests for the concept.`,
  };
}

export function formatChange(change: number | null, unit = "percentage points") {
  if (change === null) return "Not enough evidence";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change} ${unit}`;
}

export function automationIdempotencyKey(ruleKey: string, period: string) {
  return `${ruleKey}:${period}`;
}

export function nextEscalationRoles(ownerRole: string) {
  return ownerRole === "teacher"
    ? ["staff", "principal", "admin", "owner"]
    : ["principal", "admin", "owner"];
}

export function canSeeInternalIntelligence(role: string) {
  return ["teacher", "staff", "principal", "admin", "owner"].includes(role);
}

export function parentSafeFields() {
  return [
    "published_grades",
    "attendance_summary",
    "homework_consistency",
    "approved_recommendations",
    "meeting_requests",
  ] as const;
}
