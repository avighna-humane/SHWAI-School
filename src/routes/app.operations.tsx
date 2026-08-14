import { createFileRoute } from "@tanstack/react-router";
import { OperationsWorkspace } from "@/components/v5/operations-workspace";
export const Route = createFileRoute("/app/operations")({ component: OperationsWorkspace });
