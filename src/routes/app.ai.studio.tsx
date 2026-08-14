import { createFileRoute } from "@tanstack/react-router";
import { AiContentStudio } from "@/components/v3/ai-content-studio";

export const Route = createFileRoute("/app/ai/studio")({ component: AiStudioRoute });

function AiStudioRoute() {
  return <AiContentStudio />;
}
