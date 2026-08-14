import { describe, expect, it } from "vitest";
import { hashPassword, requireRole, requireSchool, verifyPassword, type AuthContext } from "./auth";

describe("V1 authentication primitives", () => {
  const context: AuthContext = {
    userId: "usr-1",
    email: "owner@example.com",
    name: "Owner",
    schoolId: "school-a",
    schoolName: "School A",
    role: "owner",
    membershipId: "membership-1",
    plan: "enterprise",
    subscriptionStatus: "active",
  };

  it("hashes passwords with a salted, non-plaintext representation", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(first).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", first)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", first)).resolves.toBe(false);
  });

  it("enforces server-derived role and school boundaries", () => {
    expect(() => requireRole(context, ["owner", "principal"])).not.toThrow();
    expect(() => requireRole(context, ["teacher"])).toThrow("Permission denied");
    expect(() => requireSchool(context, "school-a")).not.toThrow();
    expect(() => requireSchool(context, "school-b")).toThrow("Cross-school access denied");
  });
});
