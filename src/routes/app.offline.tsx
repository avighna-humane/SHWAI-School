import { createFileRoute } from "@tanstack/react-router";
import { OfflineWorkspace } from "@/components/v5/offline-workspace";
export const Route = createFileRoute("/app/offline")({ component: OfflineWorkspace });
