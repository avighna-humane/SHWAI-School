import { createFileRoute } from "@tanstack/react-router";
import { IntelligenceWorkspace } from "@/components/v4/intelligence-workspace";

export const Route = createFileRoute("/app/intelligence/school")({
  component: SchoolIntelligenceRoute,
});

function SchoolIntelligenceRoute() {
  return <IntelligenceWorkspace view="school" />;
}
