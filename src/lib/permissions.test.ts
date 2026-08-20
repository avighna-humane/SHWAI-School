import { describe, expect, it } from "vitest";
import {
  hasPermission,
  hasFeatureEntitlement,
  minimumPlanForFeature,
  planAllowsFeature,
} from "./permissions";
import type { AuthContext } from "@/lib/auth";

describe("production permission matrix", () => {
  it("keeps student access self-scoped and denies school-wide administrative access", () => {
    expect(hasPermission("student", "students.read_self")).toBe(true);
    expect(hasPermission("student", "students.read_school")).toBe(false);
    expect(hasPermission("student", "audit.read")).toBe(false);
    expect(hasPermission("student", "data.export")).toBe(false);
  });

  it("allows teachers to operate assigned academic workflows without leadership controls", () => {
    expect(hasPermission("teacher", "attendance.write")).toBe(true);
    expect(hasPermission("teacher", "grades.write")).toBe(true);
    expect(hasPermission("teacher", "users.invite")).toBe(false);
    expect(hasPermission("teacher", "school.configure")).toBe(false);
  });

  it("keeps destructive data deletion owner-only", () => {
    expect(hasPermission("principal", "data.delete")).toBe(false);
    expect(hasPermission("admin", "data.delete")).toBe(false);
    expect(hasPermission("owner", "data.delete")).toBe(true);
  });

  it("uses server-compatible plan rank semantics", () => {
    expect(minimumPlanForFeature("enterprise_ai")).toBe("enterprise");
    expect(planAllowsFeature("starter", "data_import")).toBe(true);
    expect(planAllowsFeature("starter", "ai")).toBe(false);
    expect(planAllowsFeature("enterprise", "enterprise_ai")).toBe(true);
  });

  it("requires an active reconciled subscription for paid feature access", () => {
    const context = {
      userId: "user-1",
      email: "owner@example.test",
      name: "Owner",
      schoolId: "school-1",
      schoolName: "Example School",
      role: "owner",
      membershipId: "membership-1",
      plan: "professional",
      subscriptionStatus: "active",
    } satisfies AuthContext;
    expect(hasFeatureEntitlement(context, "ai")).toBe(true);
    expect(hasFeatureEntitlement({ ...context, subscriptionStatus: "canceled" }, "ai")).toBe(false);
  });
});
