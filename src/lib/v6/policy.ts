export type V6Role = "student" | "teacher" | "parent" | "staff" | "admin" | "principal" | "owner";
export type ApprovalStatus =
  "draft" | "generated" | "pending_review" | "approved" | "rejected" | "revised" | "superseded";

const LEADERSHIP: V6Role[] = ["admin", "principal", "owner"];
const STAFF: V6Role[] = ["teacher", "staff", ...LEADERSHIP];
export function canManageV6Governance(role: V6Role) {
  return LEADERSHIP.includes(role);
}
export function canReviewAiOutput(role: V6Role) {
  return LEADERSHIP.includes(role) || role === "teacher";
}
export function canUseKnowledgeBase(role: V6Role) {
  return STAFF.includes(role) || role === "student" || role === "parent";
}
export function canRequestPrediction(role: V6Role) {
  return STAFF.includes(role);
}
export function canViewPrediction(role: V6Role, isOwnStudentTarget: boolean) {
  return (
    LEADERSHIP.includes(role) || role === "teacher" || (role === "student" && isOwnStudentTarget)
  );
}

const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ["generated", "pending_review"],
  generated: ["pending_review", "approved", "rejected", "revised", "superseded"],
  pending_review: ["approved", "rejected", "revised"],
  approved: ["revised", "superseded"],
  rejected: ["revised", "superseded"],
  revised: ["pending_review", "approved", "rejected", "superseded"],
  superseded: [],
};
export function canTransitionApproval(from: ApprovalStatus, to: ApprovalStatus) {
  return APPROVAL_TRANSITIONS[from].includes(to);
}
export function predictionAvailability(observationCount: number, minimumObservations = 30) {
  return observationCount >= minimumObservations
    ? ("pending_model" as const)
    : ("insufficient_data" as const);
}
export function providerState(configured: boolean, verified: boolean) {
  return !configured
    ? ("CONFIGURATION_REQUIRED" as const)
    : !verified
      ? ("CONFIGURATION_REQUIRED" as const)
      : ("READY" as const);
}
export function knowledgeAnswerState(approvedSourceCount: number, providerConfigured: boolean) {
  if (approvedSourceCount === 0) return "NO_APPROVED_SOURCE" as const;
  if (!providerConfigured) return "CONFIGURATION_REQUIRED" as const;
  return "READY" as const;
}
export function warningForDataQuality(input: {
  observationCount: number;
  stale: boolean;
  missingAttendance: boolean;
  missingAssessments: boolean;
}) {
  const warnings: Array<{
    type: string;
    detail: string;
    severity: "info" | "attention" | "urgent";
  }> = [];
  if (input.observationCount < 30)
    warnings.push({
      type: "insufficient_data",
      detail: "Prediction unavailable: insufficient historical data.",
      severity: "attention",
    });
  if (input.stale)
    warnings.push({
      type: "stale_data",
      detail: "The available observations are older than the configured review window.",
      severity: "attention",
    });
  if (input.missingAttendance)
    warnings.push({
      type: "missing_attendance_data",
      detail: "Attendance observations are incomplete for this target.",
      severity: "attention",
    });
  if (input.missingAssessments)
    warnings.push({
      type: "missing_assessment_data",
      detail: "Assessment observations are incomplete for this target.",
      severity: "attention",
    });
  return warnings;
}
