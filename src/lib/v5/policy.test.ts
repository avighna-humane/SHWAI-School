import { describe, expect, it } from "vitest";
import { calculateScenario, calculateWorkload } from "@/lib/v5/decision-engine";
import {
  canAccessV5Module,
  canViewContext,
  feeStatus,
  inventoryMovementAllowed,
  providerDisplayState,
  rejectsSensitiveInference,
} from "@/lib/v5/policy";

describe("V5 transparent decision engine", () => {
  it("calculates operational outputs without predicting academic outcomes", () => {
    const output = calculateScenario({
      availableTeachers: 4,
      availableRooms: 2,
      roomCapacity: 30,
      groupSize: 24,
      addedSessions: 1,
      sessionMinutes: 45,
      assignedTeachers: 1,
      assignedRooms: 0,
    });
    expect(output.metrics.studentsServed).toBe(24);
    expect(output.metrics.teacherWorkloadDeltaMinutes).toBe(45);
    expect(output.certainty.find((item) => item.field === "futureAcademicPerformance")?.state).toBe(
      "UNKNOWN",
    );
  });
  it("reports room conflicts and workload trade-offs from explicit assumptions", () => {
    const output = calculateScenario({
      availableTeachers: 1,
      availableRooms: 1,
      roomCapacity: 20,
      groupSize: 40,
      addedSessions: 2,
      sessionMinutes: 60,
      assignedTeachers: 1,
      assignedRooms: 1,
    });
    expect(output.metrics.timetableConflicts).toBe(2);
    expect(output.metrics.studentsServed).toBe(20);
    expect(output.warnings.length).toBeGreaterThan(0);
    expect(output.tradeoffs.join(" ")).toContain("120 minutes");
  });
  it("detects configured workload threshold exceedance without health inference", () => {
    const result = calculateWorkload(
      [
        {
          estimatedMinutes: 1800,
          actualMinutes: 1600,
          taskType: "grading",
          status: "planned",
          dueAt: null,
        },
        {
          estimatedMinutes: 900,
          actualMinutes: null,
          taskType: "meeting",
          status: "planned",
          dueAt: null,
        },
      ],
      2400,
    );
    expect(result.exceedsThreshold).toBe(true);
    expect(result.message).toContain("planning threshold");
  });
});

describe("V5 security and provider boundaries", () => {
  it("keeps operational modules away from student-only users", () => {
    expect(canAccessV5Module("student", "operations")).toBe(false);
    expect(canAccessV5Module("student", "support")).toBe(true);
    expect(canAccessV5Module("principal", "decisions")).toBe(true);
  });
  it("does not expose leadership-only context to teachers or parents", () => {
    expect(canViewContext("teacher", "leadership_only", false)).toBe(false);
    expect(canViewContext("parent", "student_support", true)).toBe(false);
    expect(canViewContext("student", "student_support", true)).toBe(true);
  });
  it("blocks sensitive inference language and labels unconfigured providers honestly", () => {
    expect(rejectsSensitiveInference("Infer mental health from attendance")).toBe(true);
    expect(providerDisplayState(false, false, "GPS")).toBe("GPS provider not configured.");
    expect(providerDisplayState(true, false, "SMS")).toContain("not verified");
  });
  it("prevents negative inventory and calculates fee states", () => {
    expect(inventoryMovementAllowed(2, "issue", 3)).toBe(false);
    expect(inventoryMovementAllowed(2, "issue", 2)).toBe(true);
    expect(feeStatus(1000, 0, "2020-01-01")).toBe("OVERDUE");
    expect(feeStatus(1000, 1000, "2020-01-01")).toBe("PAID");
  });
});
