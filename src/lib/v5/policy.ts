export type V5Role = "student" | "teacher" | "parent" | "staff" | "admin" | "principal" | "owner";
export type V5Module =
  | "operations"
  | "decisions"
  | "support"
  | "finance"
  | "transport"
  | "library"
  | "inventory"
  | "context";

const OPERATIONS: V5Role[] = ["staff", "admin", "principal", "owner"];
const LEADERSHIP: V5Role[] = ["admin", "principal", "owner"];
export function canAccessV5Module(role: V5Role, module: V5Module) {
  if (module === "support") return true;
  if (module === "decisions" || module === "context")
    return LEADERSHIP.includes(role) || role === "teacher" || role === "staff";
  if (module === "finance") return ["student", "parent", ...OPERATIONS].includes(role);
  if (module === "transport" || module === "library") return true;
  return OPERATIONS.includes(role);
}

export function providerDisplayState(configured: boolean, verified: boolean, label: string) {
  if (!configured) return `${label} provider not configured.`;
  if (!verified) return `${label} provider configured but not verified.`;
  return `${label} provider verified.`;
}

export function inventoryMovementAllowed(
  currentQuantity: number,
  movementType: "purchase" | "issue" | "return" | "adjustment",
  quantity: number,
) {
  if (!Number.isFinite(currentQuantity) || !Number.isFinite(quantity) || quantity <= 0)
    return false;
  return movementType !== "issue" || currentQuantity >= quantity;
}

export function feeStatus(
  total: number,
  paid: number,
  dueDate: string,
  today = new Date().toISOString().slice(0, 10),
) {
  if (total <= 0 || paid >= total) return "PAID" as const;
  if (paid > 0) return dueDate < today ? ("OVERDUE" as const) : ("PARTIALLY_PAID" as const);
  return dueDate < today ? ("OVERDUE" as const) : ("PENDING" as const);
}

export function canViewContext(
  role: V5Role,
  visibility: "need_to_know" | "student_support" | "leadership_only",
  isLinkedStudent: boolean,
) {
  if (role === "student") return isLinkedStudent && visibility === "student_support";
  if (role === "parent") return false;
  if (visibility === "leadership_only") return LEADERSHIP.includes(role);
  return role === "teacher" || role === "staff" || LEADERSHIP.includes(role);
}

const SENSITIVE_INFERENCE_WORDS = [
  "medical",
  "mental health",
  "disability",
  "family situation",
  "socioeconomic",
  "protected characteristic",
];
export function rejectsSensitiveInference(text: string) {
  const normalized = text.toLowerCase();
  return SENSITIVE_INFERENCE_WORDS.some((term) => normalized.includes(term));
}
