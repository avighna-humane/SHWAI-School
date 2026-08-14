import type { Role } from "@/types";

export const STAFF_ROLES: Role[] = ["teacher", "principal", "admin", "owner"];

export function canMarkAttendance(role: Role) {
  return STAFF_ROLES.includes(role);
}

export function canViewAttendance(role: Role) {
  return [...STAFF_ROLES, "student", "parent"].includes(role);
}

export function assertTenantAccess(targetSchoolId: string, actorSchoolId: string) {
  if (!targetSchoolId || !actorSchoolId || targetSchoolId !== actorSchoolId) {
    throw new Error("Cross-school access denied");
  }
}

export function assertActorCanViewStudent(role: Role, actorId: string, studentId?: string) {
  if (
    (role === "student" || role === "parent") &&
    (!studentId || (role === "student" && studentId !== actorId))
  ) {
    throw new Error(
      role === "student"
        ? "Students may only view their own attendance"
        : "A ward is required to view parent attendance",
    );
  }
}
