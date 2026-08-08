// SERVER-ONLY. Shared identity + relationship checks used by every server module.
//
// See supabase-admin.ts for the interim-auth explanation: `role` + `actorId` are
// trusted parameters coming from the demo app-state (no real session yet), and
// every function below re-derives the actor from the actual mock rosters and
// re-checks relationships (teacher owns class/student, notice targets actor,
// etc.) rather than trusting anything the client claims beyond who they are.
import { CLASS_SECTIONS } from "@/data/mock/core";
import { STUDENTS, TEACHERS } from "@/data/mock/people";

export type ActorRole = "student" | "teacher" | "principal";

export interface Actor {
  id: string;
  name: string;
  role: ActorRole;
  schoolId: string;
  /** Only set for students. */
  classId?: string;
  /** Only set for teachers — class ids resolved from their assigned class labels. */
  classIds?: string[];
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export const SCHOOL_ID = "sch-1";

export const PRINCIPAL_ACTOR: Actor = {
  id: "principal-1",
  name: "Dr. Vikram Nair",
  role: "principal",
  schoolId: SCHOOL_ID,
};

function classIdsForTeacher(classLabels: string[]): string[] {
  const labelToId = new Map(CLASS_SECTIONS.map((c) => [c.label, c.id]));
  return classLabels.map((label) => labelToId.get(label)).filter((id): id is string => Boolean(id));
}

/**
 * Resolves the caller into a trusted Actor by looking them up in the real mock
 * rosters. Throws ForbiddenError if the claimed role/id combination does not
 * correspond to a real person.
 */
export function resolveActor(input: { role: ActorRole; actorId?: string }): Actor {
  const { role, actorId } = input;

  if (role === "principal") {
    return PRINCIPAL_ACTOR;
  }

  if (role === "student") {
    const student = STUDENTS.find((s) => s.id === actorId);
    if (!student) throw new ForbiddenError("Unknown student.");
    return {
      id: student.id,
      name: student.name,
      role: "student",
      schoolId: SCHOOL_ID,
      classId: student.classId,
    };
  }

  if (role === "teacher") {
    const teacher = TEACHERS.find((t) => t.id === actorId);
    if (!teacher) throw new ForbiddenError("Unknown teacher.");
    return {
      id: teacher.id,
      name: teacher.name,
      role: "teacher",
      schoolId: SCHOOL_ID,
      classIds: classIdsForTeacher(teacher.classes),
    };
  }

  throw new ForbiddenError("Unknown role.");
}

export function assertTeacher(actor: Actor): void {
  if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can do this.");
}

export function assertStudent(actor: Actor): void {
  if (actor.role !== "student") throw new ForbiddenError("Only students can do this.");
}

export function assertPrincipal(actor: Actor): void {
  if (actor.role !== "principal") throw new ForbiddenError("Only the principal can do this.");
}

export function assertTeacherOwnsClass(actor: Actor, classId: string): void {
  assertTeacher(actor);
  if (!actor.classIds?.includes(classId)) {
    throw new ForbiddenError("You are not assigned to this class.");
  }
}

export function assertTeacherOwnsStudent(actor: Actor, studentId: string): void {
  assertTeacher(actor);
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) throw new NotFoundError("Student not found.");
  if (!actor.classIds?.includes(student.classId)) {
    throw new ForbiddenError("This student is not in one of your classes.");
  }
}

export function studentById(studentId: string) {
  return STUDENTS.find((s) => s.id === studentId);
}

export function teacherById(teacherId: string) {
  return TEACHERS.find((t) => t.id === teacherId);
}

export function classSectionById(classId: string) {
  return CLASS_SECTIONS.find((c) => c.id === classId);
}
