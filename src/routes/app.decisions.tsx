import { createFileRoute } from "@tanstack/react-router";
import { DecisionWorkspace } from "@/components/v5/decision-workspace";
export const Route = createFileRoute("/app/decisions")({ component: DecisionWorkspace });
