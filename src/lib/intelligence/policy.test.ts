import { describe, expect, it } from "vitest";
import {
  alertThreshold,
  confidenceFor,
  dataQuality,
  delta,
  directionFor,
  formatChange,
  recommendationFor,
  safePercent,
  automationIdempotencyKey,
  canSeeInternalIntelligence,
  nextEscalationRoles,
  parentSafeFields,
} from "./policy";

describe("V4 intelligence policy", () => {
  it("detects observed attendance and homework declines without creating a prediction", () => {
    expect(alertThreshold("attendance", 72, -8)).toBe(true);
    expect(alertThreshold("homework", 61, -18)).toBe(true);
    expect(alertThreshold("academic", 74, -4)).toBe(false);
  });

  it("handles insufficient data explicitly", () => {
    expect(dataQuality(0)).toBe("insufficient");
    expect(dataQuality(1)).toBe("insufficient");
    expect(dataQuality(2)).toBe("limited");
    expect(dataQuality(6)).toBe("good");
    expect(directionFor(null, "insufficient")).toBe("insufficient_data");
    expect(confidenceFor(1, "insufficient").confidence).toBe("insufficient_data");
  });

  it("calculates compatible changes and safe percentages", () => {
    expect(safePercent(8, 10)).toBe(80);
    expect(safePercent(0, 0)).toBeNull();
    expect(delta(72, 80)).toBe(-8);
    expect(formatChange(-8)).toBe("-8 percentage points");
    expect(formatChange(null)).toBe("Not enough evidence");
  });

  it("enforces V4 role and privacy boundaries", () => {
    expect(canSeeInternalIntelligence("teacher")).toBe(true);
    expect(canSeeInternalIntelligence("parent")).toBe(false);
    expect(canSeeInternalIntelligence("student")).toBe(false);
    expect(parentSafeFields()).not.toContain("private_tutor_messages");
    expect(nextEscalationRoles("teacher")[0]).toBe("staff");
    expect(nextEscalationRoles("staff")).not.toContain("teacher");
  });

  it("uses idempotent automation keys and evidence quality rather than fake statistical precision", () => {
    expect(confidenceFor(6, "good")).toEqual({
      confidence: "high",
      reason:
        "Multiple observations are available across the observation window and comparison period.",
    });
    expect(confidenceFor(3, "limited").confidence).toBe("medium");
    expect(recommendationFor("academic", "Published academic performance trend").action).toContain(
      "targeted revision",
    );
    expect(recommendationFor("attendance", "Attendance trend").rationale).toContain(
      "approved leave",
    );
    expect(automationIdempotencyKey("weekly-academic", "2026-08-14")).toBe(
      "weekly-academic:2026-08-14",
    );
  });
});
