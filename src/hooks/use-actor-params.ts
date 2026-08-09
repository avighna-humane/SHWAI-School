import { useAppState } from "@/app/providers/app-state";
import type { ActorRole } from "@/rpc/auth-context";

/**
 * Maps the demo app-state role/ids into the {role, actorId} shape every
 * server function expects. "admin" is treated as "principal" (see ROLE_LABEL).
 * Returns null for roles with no SHWAI workflow surface (parent/owner).
 */
export function useActorParams(): { role: ActorRole; actorId?: string } | null {
  const { role, studentId, teacherId } = useAppState();
  if (role === "student") return { role: "student", actorId: studentId };
  if (role === "teacher") return { role: "teacher", actorId: teacherId };
  if (role === "principal" || role === "admin") return { role: "principal" };
  return null;
}
