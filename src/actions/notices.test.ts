import { describe, expect, it } from "vitest";
import { getAudienceOptions } from "./notices";

describe("notice audience policy", () => {
  it("does not expose create targets to students or parents", () => {
    expect(getAudienceOptions("student")).toEqual([]);
    expect(getAudienceOptions("parent")).toEqual([]);
  });

  it("does not allow teachers to target all teachers or the entire school", () => {
    const values = getAudienceOptions("teacher").map((option) => option.value);
    expect(values).toContain("all-students");
    expect(values).not.toContain("all-teachers");
    expect(values).not.toContain("entire-school");
  });

  it("allows principal-level roles to publish school and teacher notices", () => {
    const values = getAudienceOptions("principal").map((option) => option.value);
    expect(values).toContain("entire-school");
    expect(values).toContain("all-teachers");
    expect(values.some((value) => value.startsWith("teacher-"))).toBe(true);
  });
});
