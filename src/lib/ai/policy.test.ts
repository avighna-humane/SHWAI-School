import { describe, expect, it } from "vitest";
import { requireSchool, type AuthContext } from "@/lib/auth";
import { generatedQuestionSetSchema, tutorResponseSchema } from "@/lib/ai/schemas";
import {
  AI_MAX_INPUT_CHARS,
  AI_REQUESTS_PER_DAY_PER_SCHOOL,
  AI_REQUESTS_PER_MINUTE,
  assertInputSize,
  assertPromptSafe,
  enforceAiUsage,
  minimizeAcademicContext,
  requireAiRole,
} from "@/lib/ai/policy";

const context = (role: AuthContext["role"], schoolId = "school-a"): AuthContext => ({
  userId: "user-1",
  email: "user@example.com",
  name: "Test User",
  schoolId,
  schoolName: "Test School",
  role,
  membershipId: "membership-1",
});

describe("V3 AI policy", () => {
  it("allows only students to use the tutor policy and only teaching roles to generate content", () => {
    expect(() => requireAiRole(context("student"), "student")).not.toThrow();
    expect(() => requireAiRole(context("teacher"), "student")).toThrow(
      "not available for your role",
    );
    expect(() => requireAiRole(context("parent"), "teacher")).toThrow(
      "not available for your role",
    );
    expect(() => requireAiRole(context("teacher"), "teacher")).not.toThrow();
  });

  it("rejects cross-school access at the shared server boundary", () => {
    expect(() => requireSchool(context("teacher"), "school-b")).toThrow(
      "Cross-school access denied",
    );
    expect(() => requireSchool(context("teacher"), "school-a")).not.toThrow();
  });

  it("blocks unsafe prompts and oversized inputs", () => {
    expect(() => assertPromptSafe("How to make a weapon for a student?")).toThrow(
      "student-safe AI policy",
    );
    expect(() => assertPromptSafe("Explain equivalent fractions with a number line")).not.toThrow();
    expect(() => assertInputSize("x".repeat(AI_MAX_INPUT_CHARS))).not.toThrow();
    expect(() => assertInputSize("x".repeat(AI_MAX_INPUT_CHARS + 1))).toThrow("too large");
  });

  it("enforces the per-minute request limit before checking daily school volume", async () => {
    const sql = (async () => [{ count: AI_REQUESTS_PER_MINUTE }]) as unknown as ReturnType<
      typeof import("@/lib/db").requireDatabase
    >;
    await expect(enforceAiUsage(sql, context("student"), "ai_tutor", 120)).rejects.toThrow(
      "request limit",
    );
  });

  it("enforces the daily school limit after the per-user minute window passes", async () => {
    let calls = 0;
    const sql = (async () => {
      calls += 1;
      return [{ count: calls === 1 ? 0 : AI_REQUESTS_PER_DAY_PER_SCHOOL }];
    }) as unknown as ReturnType<typeof import("@/lib/db").requireDatabase>;
    await expect(enforceAiUsage(sql, context("teacher"), "generate_homework", 120)).rejects.toThrow(
      "daily AI request limit",
    );
  });

  it("minimizes academic context and clamps grades before provider submission", () => {
    expect(
      minimizeAcademicContext({
        subject: "Mathematics",
        topic: "Fractions",
        classLabel: "Grade 6",
        assignmentTitles: ["A".repeat(300)],
        grades: [{ subject: "Mathematics", percentage: 150 }],
      }),
    ).toEqual({
      subject: "Mathematics",
      topic: "Fractions",
      classLabel: "Grade 6",
      assignmentTitles: ["A".repeat(160)],
      grades: [{ subject: "Mathematics", percentage: 100 }],
    });
  });

  it("rejects malformed provider output through the same schemas used by server actions", () => {
    expect(generatedQuestionSetSchema.safeParse({ title: "Draft", questions: [] }).success).toBe(
      false,
    );
    expect(
      tutorResponseSchema.safeParse({
        response: "Start by identifying the known values.",
        hintLevel: 2,
        nextStep: "Write the equation.",
        safetyNote: null,
        suggestedPractice: [],
      }).success,
    ).toBe(true);
  });
});
