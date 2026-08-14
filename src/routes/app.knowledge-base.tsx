import { createFileRoute } from "@tanstack/react-router";
import { V6KnowledgeWorkspace } from "@/components/v6/knowledge-workspace";
export const Route = createFileRoute("/app/knowledge-base")({ component: V6KnowledgeWorkspace });
