import { createFileRoute } from "@tanstack/react-router";
import { IntelligenceWorkspace } from "@/components/v4/intelligence-workspace";

export const Route = createFileRoute("/app/interventions")({ component: InterventionsRoute });

function InterventionsRoute() {
  return <IntelligenceWorkspace view="interventions" />;
}
