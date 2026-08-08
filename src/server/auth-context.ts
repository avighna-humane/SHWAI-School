/**
 * SERVER-ONLY relationship/authorization helpers.
 *
 * There is no real session yet (auth is explicitly out of scope for this
 * pass — see `v0_plans/prime-strategy.md`). The client sends a claimed
 * `{ role, actorId }` with every server-function call. Every function in
 * `src/server/*` MUST call `resolveActor` (or one of the `assert*` helpers
 * below) FIRST and use only the server-resolved identity from then on —
 * never trust any other field the client sends about "who they are".
 *
 * These functions cross-reference the existing mock rosters (STUDENTS,
 * TEACHERS, CLASS_SECTIONS) to compute real relationships: which classes a
 * teacher teaches, which students are in those classes, which school a
 * record belongs to. When real Supabase Auth is introduced later, replace
 * `actorId` with a server-derived `auth.uid()` mapped to a profile row, and
 * mirror these same relationship checks into RLS policies.
 */
import { STUDENTS, TEACHERS } from "@/data/mock/people";
import { CLASS_SECTIONS } from "@/data/mock/core";

export const DEMO_SCHOOL_ID = "sch-1";

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export type ActorRole = "student" | "teacher" | "principal";

export interface Actor {
  role: ActorRole;
  id: string;
  name: string;
  schoolId: string;
  /** Only populated for teachers: class ids they are authorized to teach. */
  classIds: string[];
  /** Only populated for students: their own class id. */
  classId?: string;
}

const PRINCIPAL_ACTOR_ID = "principal-1";
const PRINCIPAL_NAME = "Dr. Vikram Nair";

function teacherClassIds(teacherId: string): string[] {
  const teacher = TEACHERS.find((t) => t.id === teacherId);
  if (!teacher) return [];
  const byLabel = new Set(teacher.classes);
  return CLASS_SECTIONS.filter((c) => byLabel.has(c.label) || c.classTeacherId === teacherId).map((c) => c.id);
}

/**
 * Resolves and validates a claimed identity against the real mock rosters.
 * Throws ForbiddenError if the claimed actorId does not correspond to a real
 * record for that role.
 */
export function resolveActor(input: { role: string; actorId: string }): Actor {
  const { role, actorId } = input;

  if (role === "principal") {
    if (actorId !== PRINCIPAL_ACTOR_ID) throw new ForbiddenError("Unknown principal identity.");
    return { role: "principal", id: PRINCIPAL_ACTOR_ID, name: PRINCIPAL_NAME, schoolId: DEMO_SCHOOL_ID, classIds: [] };
  }

  if (role === "teacher") {
    const teacher = TEACHERS.find((t) => t.id === actorId);
    if (!teacher) throw new ForbiddenError("Unknown teacher identity.");
    return {
      role: "teacher",
      id: teacher.id,
      name: teacher.name,
      schoolId: DEMO_SCHOOL_ID,
      classIds: teacherClassIds(teacher.id),
    };
  }

  if (role === "student") {
    const student = STUDENTS.find((s) => s.id === actorId);
    if (!student) throw new ForbiddenError("Unknown student identity.");
    return {
      role: "student",
      id: student.id,
      name: student.name,
      schoolId: DEMO_SCHOOL_ID,
      classIds: [],
      classId: student.classId,
    };
  }

  throw new ForbiddenError("This action is not available for your role.");
}

export function assertTeacher(actor: Actor): asserts actor is Actor & { role: "teacher" } {
  if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can perform this action.");
}

export function assertStudent(actor: Actor): asserts actor is Actor & { role: "student" } {
  if (actor.role !== "student") throw new ForbiddenError("Only students can perform this action.");
}

export function assertPrincipal(actor: Actor): asserts actor is Actor & { role: "principal" } {
  if (actor.role !== "principal") throw new ForbiddenError("Only the principal can perform this action.");
}

export function assertTeacherOwnsClass(actor: Actor, classId: string) {
  assertTeacher(actor);
  if (!actor.classIds.includes(classId)) {
    throw new ForbiddenError("You are not authorized to teach this class.");
  }
}

export function assertTeacherOwnsStudent(actor: Actor, studentId: string) {
  assertTeacher(actor);
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) throw new NotFoundError("Student not found.");
  if (!actor.classIds.includes(student.classId)) {
    throw new ForbiddenError("This student is not in one of your classes.");
  }
}

export function studentsInClasses(classIds: string[]) {
  const set = new Set(classIds);
  return STUDENTS.filter((s) => set.has(s.classId));
}

export function getTeacher(teacherId: string) {
  return TEACHERS.find((t) => t.id === teacherId);
}

export function getStudent(studentId: string) {
  return STUDENTS.find((s) => s.id === studentId);
}

export function getClassSection(classId: string) {
  return CLASS_SECTIONS.find((c) => c.id === classId);
}

/** Teacher ids authorized to teach the given class. */
export function teachersForClass(classId: string): string[] {
  return TEACHERS.filter((t) => teacherClassIds(t.id).includes(classId)).map((t) => t.id);
}

/**
 * Validates the teacher<->student relationship required for chat: the
 * teacher must teach the student's class. Used for both directions (teacher
 * opening a thread with a student, and student opening one with a teacher).
 */
export function assertTeacherStudentRelationship(teacherId: string, studentId: string) {
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) throw new NotFoundError("Student not found.");
  if (!teachersForClass(student.classId).includes(teacherId)) {
    throw new ForbiddenError("This teacher and student do not share a class relationship.");
  }
}
