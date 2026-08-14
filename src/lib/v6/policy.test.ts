import { describe, expect, it } from "vitest";
import {
  canManageV6Governance,
  canReviewAiOutput,
  canTransitionApproval,
  knowledgeAnswerState,
  predictionAvailability,
  providerState,
  warningForDataQuality,
} from "@/lib/v6/policy";

describe("V6 governance policy", () => {
  it("restricts governance and review by server role", () => {
    expect(canManageV6Governance("teacher")).toBe(false);
    expect(canManageV6Governance("principal")).toBe(true);
    expect(canReviewAiOutput("teacher")).toBe(true);
    expect(canReviewAiOutput("student")).toBe(false);
  });
  it("enforces human approval transitions", () => {
    expect(canTransitionApproval("generated", "pending_review")).toBe(true);
    expect(canTransitionApproval("pending_review", "approved")).toBe(true);
    expect(canTransitionApproval("superseded", "approved")).toBe(false);
    expect(canTransitionApproval("approved", "rejected")).toBe(false);
  });
  it("keeps knowledge answers source- and provider-dependent", () => {
    expect(knowledgeAnswerState(0, true)).toBe("NO_APPROVED_SOURCE");
    expect(knowledgeAnswerState(2, false)).toBe("CONFIGURATION_REQUIRED");
    expect(knowledgeAnswerState(2, true)).toBe("READY");
  });
  it("does not create prediction values from insufficient history", () => {
    expect(predictionAvailability(0)).toBe("insufficient_data");
    expect(predictionAvailability(29)).toBe("insufficient_data");
    expect(predictionAvailability(30)).toBe("pending_model");
  });
  it("emits warnings only for supplied data-quality conditions", () => {
    const warnings = warningForDataQuality({
      observationCount: 5,
      stale: true,
      missingAttendance: true,
      missingAssessments: false,
    });
    expect(warnings.map((warning) => warning.type)).toEqual([
      "insufficient_data",
      "stale_data",
      "missing_attendance_data",
    ]);
    expect(
      warningForDataQuality({
        observationCount: 40,
        stale: false,
        missingAttendance: false,
        missingAssessments: false,
      }),
    ).toEqual([]);
  });
  it("exposes provider configuration state honestly", () => {
    expect(providerState(false, false)).toBe("CONFIGURATION_REQUIRED");
    expect(providerState(true, false)).toBe("CONFIGURATION_REQUIRED");
    expect(providerState(true, true)).toBe("READY");
  });
});
