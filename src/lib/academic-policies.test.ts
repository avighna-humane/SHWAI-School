import { describe, expect, it } from "vitest";
import { canViewPublishedGrade, timetableRangesOverlap, validateMarks } from "./academic-policies";

describe("V2 academic policies", () => {
  it("rejects invalid marks and accepts marks within the assessment maximum", () => {
    expect(validateMarks(0, 0)).toBe("Maximum marks must be greater than zero");
    expect(validateMarks(100, -1)).toBe("Obtained marks cannot be negative");
    expect(validateMarks(100, 101)).toBe("Obtained marks cannot exceed maximum marks");
    expect(validateMarks(100, 75)).toBeNull();
  });

  it("detects overlapping timetable slots using half-open intervals", () => {
    expect(timetableRangesOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
    expect(timetableRangesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("keeps unpublished grades hidden from students and parents", () => {
    expect(
      canViewPublishedGrade({
        role: "student",
        gradePublished: false,
        isOwner: true,
        isLinkedChild: false,
      }),
    ).toBe(false);
    expect(
      canViewPublishedGrade({
        role: "parent",
        gradePublished: false,
        isOwner: false,
        isLinkedChild: true,
      }),
    ).toBe(false);
    expect(
      canViewPublishedGrade({
        role: "student",
        gradePublished: true,
        isOwner: true,
        isLinkedChild: false,
      }),
    ).toBe(true);
    expect(
      canViewPublishedGrade({
        role: "parent",
        gradePublished: true,
        isOwner: false,
        isLinkedChild: true,
      }),
    ).toBe(true);
  });
});
