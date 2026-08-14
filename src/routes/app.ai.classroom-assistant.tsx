import { createFileRoute } from "@tanstack/react-router";
import { V6ClassroomAssistantWorkspace } from "@/components/v6/classroom-assistant-workspace";
export const Route = createFileRoute("/app/ai/classroom-assistant")({
  component: V6ClassroomAssistantWorkspace,
});
