import { createFileRoute } from "@tanstack/react-router";
import { V6LearningJourneyWorkspace } from "@/components/v6/learning-journey-workspace";
export const Route = createFileRoute("/app/ai/learning-journeys")({
  component: V6LearningJourneyWorkspace,
});
