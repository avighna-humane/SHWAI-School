/**
 * Mock service layer.
 *
 * Every function here is async and returns realistic data after a simulated
 * network delay. Swap the body of any function for a `fetch()` call to a real
 * API and no UI component needs to change.
 */
import * as core from "@/data/mock/core";
import * as people from "@/data/mock/people";
import * as academics from "@/data/mock/academics";
import * as operations from "@/data/mock/operations";
import * as intelligence from "@/data/mock/intelligence";
import * as support from "@/data/mock/support";
import * as platform from "@/data/mock/platform";
import { TUTOR_HINTS } from "@/data/mock/platform";
import type { AiChatMessage, Submission } from "@/types";

export const LATENCY_MS = 420;

export function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Simulated failure — used by "Retry" demos on error states. */
export function failing<T>(
  message = "Could not reach the school server. Check your connection and retry.",
): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), LATENCY_MS));
}

export const mockService = {
  // --- core -------------------------------------------------------------
  schools: () => delay(core.SCHOOLS),
  academicYears: () => delay(core.ACADEMIC_YEARS),
  classSections: () => delay(core.CLASS_SECTIONS),
  subjects: () => delay(core.SUBJECTS),

  // --- people -----------------------------------------------------------
  students: () => delay(people.STUDENTS),
  student: (id: string) => delay(people.STUDENTS.find((s) => s.id === id)),
  alumni: () => delay(people.ALUMNI),
  teachers: () => delay(people.TEACHERS),
  parents: () => delay(people.PARENTS),
  staff: () => delay(people.STAFF),

  // --- academics --------------------------------------------------------
  assignments: () => delay(academics.ASSIGNMENTS),
  submissions: (assignmentId?: string) =>
    delay(
      assignmentId
        ? academics.SUBMISSIONS.filter((s) => s.assignmentId === assignmentId)
        : academics.SUBMISSIONS,
    ),
  grades: () => delay(academics.GRADE_ENTRIES),
  exams: () => delay(academics.EXAMS),
  quizzes: () => delay(academics.QUIZZES),
  attendanceToday: () => delay(academics.ATTENDANCE_TODAY),
  timetable: () => delay(academics.TIMETABLE),

  // --- operations -------------------------------------------------------
  fees: () => delay(operations.FEE_RECORDS),
  admissions: () => delay(operations.ADMISSIONS),
  transport: () => delay(operations.TRANSPORT_ROUTES),
  library: () => delay(operations.LIBRARY_ITEMS),
  inventory: () => delay(operations.INVENTORY_ITEMS),

  // --- intelligence -----------------------------------------------------
  concepts: () => delay(intelligence.CONCEPTS),
  misconceptions: () => delay(intelligence.MISCONCEPTIONS),
  learningDebt: () => delay(intelligence.LEARNING_DEBT),
  riskAlerts: () => delay(intelligence.RISK_ALERTS),
  workload: () => delay(intelligence.WORKLOAD_SIGNALS),
  predictions: () => delay(intelligence.PREDICTIONS),
  scenarios: () => delay(intelligence.SCENARIOS),

  // --- support ----------------------------------------------------------
  interventions: () => delay(support.INTERVENTIONS),
  experiments: () => delay(support.EXPERIMENTS),
  contextEntries: () => delay(support.CONTEXT_ENTRIES),
  helpMatches: () => delay(support.HELP_MATCHES),

  // --- platform ---------------------------------------------------------
  notifications: () => delay(platform.NOTIFICATIONS),
  messages: () => delay(platform.MESSAGE_THREADS),
  announcements: () => delay(platform.ANNOUNCEMENTS),
  calendar: () => delay(platform.CALENDAR_EVENTS),
  documents: () => delay(platform.DOCUMENTS),
  auditLogs: () => delay(platform.AUDIT_LOGS),
  reports: () => delay(platform.REPORTS),
  integrations: () => delay(platform.INTEGRATIONS),
  provenance: () => delay(platform.PROVENANCE),
  recommendations: () => delay(platform.AI_RECOMMENDATIONS),

  // --- simulated mutations ---------------------------------------------
  saveAttendance: (records: { studentId: string; status: string }[]) =>
    delay({ ok: true, saved: records.length }, 700),

  gradeSubmission: (submissionId: string, marks: number, feedback: string) =>
    delay<{ ok: true; submission: Partial<Submission> }>(
      { ok: true, submission: { id: submissionId, marks, feedback, status: "graded" } },
      600,
    ),

  createAssignment: (payload: Record<string, unknown>) =>
    delay({ ok: true, id: `asg-${Date.now()}`, payload }, 800),

  generateReport: (reportId: string) => delay({ ok: true, reportId, url: "#mock-report" }, 1200),

  exportData: (entity: string, format: string) =>
    delay({ ok: true, entity, format, rows: 128 }, 900),

  syncOffline: (count: number) => delay({ ok: true, synced: count }, 1500),

  /** Progressive-hint tutor: five hints, then a full explanation. */
  askTutor: (question: string, hintLevel: number): Promise<AiChatMessage> => {
    const capped = Math.min(hintLevel, TUTOR_HINTS.length);
    const body =
      capped < TUTOR_HINTS.length
        ? TUTOR_HINTS[capped]
        : "Full explanation: factorise x² − 5x + 6 as (x − 2)(x − 3) = 0. A product is zero only when one factor is zero, so x = 2 or x = 3. Substitute both back into the original equation to check.";
    return delay({
      id: `tc-${Date.now()}`,
      role: "assistant",
      body: body ?? "",
      at: "Just now",
      hintLevel: capped + 1,
      provenanceId: "prv-5",
    });
  },

  generateContent: (kind: string, topic: string) =>
    delay(
      {
        ok: true,
        kind,
        topic,
        provenanceId: "prv-1",
        preview: `${kind} for “${topic}” — 3 sections, 12 items, answer key included. Aligned to CBSE learning outcomes.`,
      },
      1400,
    ),

  askLeadershipAssistant: (question: string) =>
    delay(
      {
        answer:
          "Grade 9 — C is the weakest cohort this term: attendance is 84% against a school average of 93%, and Mathematics fell 11 marks between UT1 and UT2. Two of the four teachers assigned to the section are showing sustained workload above 85. The strongest single lever is a two-period prerequisite block in Mathematics plus an attendance contract for the nine students below 75%.",
        question,
        sources: [
          "Unit Test 2 results",
          "Attendance register (30-day window)",
          "Teacher workload signals",
        ],
        confidence: 0.83,
        provenanceId: "prv-1",
      },
      1100,
    ),
};

export type MockService = typeof mockService;
