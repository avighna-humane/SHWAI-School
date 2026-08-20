import type { AuthContext } from "@/lib/auth";
import type { PlanId, Role } from "@/types";

export type Permission =
  | "students.read_self"
  | "students.read_school"
  | "students.write"
  | "attendance.read_self"
  | "attendance.read_school"
  | "attendance.write"
  | "grades.read_self"
  | "grades.read_school"
  | "grades.write"
  | "fees.read_self"
  | "fees.read_school"
  | "fees.write"
  | "admissions.read"
  | "admissions.write"
  | "staff.manage"
  | "users.invite"
  | "audit.read"
  | "audit.export"
  | "context.read_sensitive"
  | "context.write"
  | "simulation.approve"
  | "experiment.approve"
  | "school.configure"
  | "data.import"
  | "data.export"
  | "data.delete"
  | "security.manage"
  | "billing.manage";

const ALL_ROLES: Role[] = ["student", "teacher", "parent", "staff", "admin", "principal", "owner"];
const LEADERSHIP: Role[] = ["admin", "principal", "owner"];
const OPERATIONS: Role[] = ["staff", "admin", "principal", "owner"];

const ROLE_PERMISSIONS: Record<Permission, Role[]> = {
  "students.read_self": ALL_ROLES,
  "students.read_school": ["teacher", ...LEADERSHIP],
  "students.write": LEADERSHIP,
  "attendance.read_self": ALL_ROLES,
  "attendance.read_school": ["teacher", ...OPERATIONS],
  "attendance.write": ["teacher", ...OPERATIONS],
  "grades.read_self": ALL_ROLES,
  "grades.read_school": ["teacher", ...LEADERSHIP],
  "grades.write": ["teacher", ...LEADERSHIP],
  "fees.read_self": ["student", "parent", ...LEADERSHIP],
  "fees.read_school": OPERATIONS,
  "fees.write": OPERATIONS,
  "admissions.read": OPERATIONS,
  "admissions.write": OPERATIONS,
  "staff.manage": LEADERSHIP,
  "users.invite": LEADERSHIP,
  "audit.read": LEADERSHIP,
  "audit.export": ["admin", "principal", "owner"],
  "context.read_sensitive": ["principal", "owner"],
  "context.write": LEADERSHIP,
  "simulation.approve": LEADERSHIP,
  "experiment.approve": LEADERSHIP,
  "school.configure": LEADERSHIP,
  "data.import": LEADERSHIP,
  "data.export": ["principal", "owner"],
  "data.delete": ["owner"],
  "security.manage": ["owner"],
  "billing.manage": ["owner"],
};

const PLAN_RANK: Record<PlanId, number> = { starter: 0, professional: 1, enterprise: 2 };
const FEATURE_MINIMUM_PLAN: Record<string, PlanId> = {
  ai: "professional",
  intelligence: "professional",
  operations: "professional",
  enterprise_ai: "enterprise",
  data_import: "starter",
  data_export: "starter",
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[permission].includes(role);
}

export function requirePermission(context: AuthContext, permission: Permission) {
  if (!hasPermission(context.role, permission)) throw new Error("Permission denied");
}

export function planAllowsFeature(plan: PlanId, feature: keyof typeof FEATURE_MINIMUM_PLAN) {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MINIMUM_PLAN[feature]];
}

export function minimumPlanForFeature(feature: keyof typeof FEATURE_MINIMUM_PLAN) {
  return FEATURE_MINIMUM_PLAN[feature];
}

const ENTITLED_SUBSCRIPTION_STATES = new Set([
  "active",
  "trialing",
  "past_due",
  "grace_period",
  "system",
]);

export function hasFeatureEntitlement(
  context: AuthContext,
  feature: keyof typeof FEATURE_MINIMUM_PLAN,
) {
  return (
    ENTITLED_SUBSCRIPTION_STATES.has(context.subscriptionStatus) &&
    planAllowsFeature(context.plan, feature)
  );
}

export function requireFeatureEntitlement(
  context: AuthContext,
  feature: keyof typeof FEATURE_MINIMUM_PLAN,
) {
  if (!hasFeatureEntitlement(context, feature)) {
    throw new Error(
      `The ${feature} feature requires an active ${minimumPlanForFeature(feature)} subscription`,
    );
  }
}
