import type { PlanId, Role } from "@/types";

export const ROLES: { id: Role; label: string; description: string; homePath: string }[] = [
  {
    id: "student",
    label: "Student",
    description: "Homework, AI tutor, grades, progress",
    homePath: "/app",
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Classes, grading, AI assistant, interventions",
    homePath: "/app",
  },
  {
    id: "parent",
    label: "Parent",
    description: "Ward progress, fees, transport, meetings",
    homePath: "/app",
  },
  {
    id: "staff",
    label: "Staff",
    description: "School operations, attendance and notices",
    homePath: "/app",
  },
  {
    id: "principal",
    label: "Principal",
    description: "School intelligence, staff, governance",
    homePath: "/app",
  },
  {
    id: "owner",
    label: "School Owner",
    description: "Multi-campus, subscription, board reporting",
    homePath: "/app",
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  teacher: "Teacher",
  parent: "Parent",
  staff: "Staff",
  admin: "Principal",
  principal: "Principal",
  owner: "School Owner",
};

export const DEMO_USER: Record<Role, { name: string; sub: string; initials: string }> = {
  student: { name: "Aarav Sharma", sub: "Grade 9 · Section A", initials: "AS" },
  teacher: { name: "Meera Iyer", sub: "Mathematics · Class Teacher 9A", initials: "MI" },
  parent: { name: "Rajesh Sharma", sub: "Parent of Aarav & Ananya", initials: "RS" },
  staff: { name: "Kavita Rao", sub: "School Staff · Sunrise Public School", initials: "KR" },
  admin: { name: "Sunita Deshpande", sub: "Principal · Sunrise Public School", initials: "SD" },
  principal: { name: "Dr. Vikram Nair", sub: "Principal · Sunrise Public School", initials: "VN" },
  owner: { name: "Harish Agarwal", sub: "Trustee · Sunrise Education Group", initials: "HA" },
};

/** Broad capability keys used for permission-denied states. */
export type Capability =
  | "manage-school"
  | "manage-people"
  | "grade"
  | "mark-attendance"
  | "view-own-progress"
  | "view-ward"
  | "school-intelligence"
  | "governance"
  | "billing"
  | "sensitive-context";

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  student: ["view-own-progress"],
  teacher: ["grade", "mark-attendance", "view-own-progress"],
  parent: ["view-ward"],
  staff: ["mark-attendance", "manage-school"],
  admin: [
    "manage-school",
    "manage-people",
    "grade",
    "mark-attendance",
    "school-intelligence",
    "sensitive-context",
  ],
  principal: [
    "manage-school",
    "manage-people",
    "school-intelligence",
    "governance",
    "sensitive-context",
  ],
  owner: ["manage-school", "school-intelligence", "governance", "billing"],
};

export function can(role: Role, capability: Capability) {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export const PLAN_RANK: Record<PlanId, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};
