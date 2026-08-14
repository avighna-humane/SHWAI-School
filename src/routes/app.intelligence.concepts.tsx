import { createFileRoute } from "@tanstack/react-router";
import { IntelligenceWorkspace } from "@/components/v4/intelligence-workspace";

export const Route = createFileRoute("/app/intelligence/concepts")({ component: ConceptsRoute });

function ConceptsRoute() {
  return <IntelligenceWorkspace view="concepts" />;
}
