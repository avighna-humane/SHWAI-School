import { createFileRoute } from "@tanstack/react-router";
import { IntelligenceWorkspace } from "@/components/v4/intelligence-workspace";

export const Route = createFileRoute("/app/intelligence/assistant")({
  component: LeadershipAssistantRoute,
});

function LeadershipAssistantRoute() {
  return <IntelligenceWorkspace view="assistant" />;
}
