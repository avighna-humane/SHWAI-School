import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { listHomework, type HomeworkRow } from "@/actions/homework";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/app/providers/app-state";

export function ParentHomeworkView() {
  const { schoolId, role, userId } = useAppState();
  const query = useQuery({
    queryKey: ["parent-homework", schoolId, userId],
    queryFn: () => listHomework({ data: { schoolId, role, userId } }),
    enabled: typeof window !== "undefined",
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          V2 parent academic view
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Homework</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only assignments belonging to your linked children are returned by the authenticated
          server query.
        </p>
      </header>
      {query.isLoading ? (
        <State
          title="Loading linked homework…"
          body="The server is resolving parent–student relationships."
          icon={<Icons.Loader2 className="size-8 animate-spin" />}
        />
      ) : query.isError ? (
        <State
          title="Homework is unavailable"
          body={(query.error as Error).message}
          icon={<Icons.DatabaseZap className="size-8 text-danger/70" />}
          retry={() => query.refetch()}
        />
      ) : query.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {query.data.map((homework: HomeworkRow) => (
            <section key={homework.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {homework.subject}
                  </p>
                  <h2 className="mt-1 font-semibold">{homework.title}</h2>
                </div>
                <Badge variant="outline">{homework.status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {homework.description || "No instructions provided."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Due {new Date(homework.due_date).toLocaleDateString("en-IN")} ·{" "}
                {homework.total_marks} marks
              </p>
            </section>
          ))}
        </div>
      ) : (
        <State
          title="No linked homework"
          body="No published homework is available for the children linked to this parent account."
          icon={<Icons.NotebookPen className="size-8 text-muted-foreground/50" />}
        />
      )}
    </div>
  );
}
function State({
  title,
  body,
  icon,
  retry,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="surface-panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{body}</p>
      {retry ? (
        <button className="mt-4 rounded-md border px-3 py-2 text-sm" onClick={retry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
