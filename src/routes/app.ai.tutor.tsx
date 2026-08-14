import { createFileRoute } from "@tanstack/react-router";
import { AiTutor } from "@/components/v3/ai-tutor";

export const Route = createFileRoute("/app/ai/tutor")({ component: AiTutorRoute });

function AiTutorRoute() {
  return <AiTutor />;
}
