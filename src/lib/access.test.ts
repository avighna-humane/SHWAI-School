import { describe, expect, it } from "vitest";
import {
  assertActorCanViewStudent,
  assertTenantAccess,
  canMarkAttendance,
  canViewAttendance,
} from "./access";

describe("SHWAI access policy", () => {
  it("allows staff to mark attendance but keeps student and parent views read-only", () => {
    expect(canMarkAttendance("teacher")).toBe(true);
    expect(canMarkAttendance("principal")).toBe(true);
    expect(canMarkAttendance("student")).toBe(false);
    expect(canMarkAttendance("parent")).toBe(false);
    expect(canViewAttendance("student")).toBe(true);
    expect(canViewAttendance("parent")).toBe(true);
  });

  it("rejects cross-school access on the server policy boundary", () => {
    expect(() => assertTenantAccess("school-a", "school-b")).toThrow("Cross-school access denied");
    expect(() => assertTenantAccess("school-a", "school-a")).not.toThrow();
  });

  it("limits student attendance reads to the acting student", () => {
    expect(() => assertActorCanViewStudent("student", "stu-1", "stu-2")).toThrow(
      "Students may only view their own attendance",
    );
    expect(() => assertActorCanViewStudent("student", "stu-1", "stu-1")).not.toThrow();
    expect(() => assertActorCanViewStudent("parent", "demo-parent")).toThrow("A ward is required");
  });
});
