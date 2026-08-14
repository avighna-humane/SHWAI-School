import { createFileRoute } from "@tanstack/react-router";
import { AiContentStudio } from "@/components/v3/ai-content-studio";

export const Route = createFileRoute("/app/ai/teacher-assistant")({
  component: TeacherAssistantRoute,
});

function TeacherAssistantRoute() {
  return <AiContentStudio mode="assistant" />;
}
