import { createFileRoute } from "@tanstack/react-router";
import { V6PredictionWorkspace } from "@/components/v6/prediction-workspace";
export const Route = createFileRoute("/app/predictions")({ component: V6PredictionWorkspace });
