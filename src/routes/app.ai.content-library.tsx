import { createFileRoute } from "@tanstack/react-router";
import { AiContentStudio } from "@/components/v3/ai-content-studio";

export const Route = createFileRoute("/app/ai/content-library")({
  component: AiContentLibraryRoute,
});

function AiContentLibraryRoute() {
  return <AiContentStudio />;
}
