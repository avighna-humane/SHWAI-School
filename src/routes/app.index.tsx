import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { ROLE_LABEL } from "@/config/roles";
import { EmptyState } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Database, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const { role } = useAppState();

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> Workspace overview
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome to your workspace</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your {ROLE_LABEL[role].toLowerCase()} workspace is ready. Connect your school data to begin viewing live
          attendance, academic, operations, and communication information.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          title="No school data available yet"
          description="Add or connect records to begin viewing dashboard summaries and trends. SHWAI does not invent school statistics."
          icon={<Database className="size-6" aria-hidden />}
        />
        <section className="surface-panel flex min-h-[280px] flex-col justify-center p-6">
          <div className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
            <ShieldCheck className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-lg font-bold tracking-tight">Your access is ready</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            You are signed in as {ROLE_LABEL[role]}. Available modules and permissions are determined by this account
            role.
          </p>
        </section>
      </div>

      <FloatingAI />
    </div>
  );
}