import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { getV6LearningJourneys, saveV6LearningJourney } from "@/actions/v6";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function V6LearningJourneyWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const canEdit = ["teacher", "staff", "admin", "principal", "owner"].includes(role);
  const journeys = useQuery({
    queryKey: ["v6-learning-journeys", schoolId],
    queryFn: () => getV6LearningJourneys(),
  });
  const [studentId, setStudentId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [nextConcept, setNextConcept] = React.useState("");
  const saveMutation = useMutation({
    mutationFn: () =>
      saveV6LearningJourney({
        data: {
          studentId,
          subject,
          recommendedNextConcept: nextConcept,
          concepts: [],
          currentMastery: {},
          prerequisiteGaps: [],
          recommendedPractice: [],
          revisionSchedule: [],
          progress: {},
          status: "active",
        },
      }),
    onSuccess: () => {
      setStudentId("");
      setSubject("");
      setNextConcept("");
      void queryClient.invalidateQueries({ queryKey: ["v6-learning-journeys", schoolId] });
    },
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
          <span className="size-1.5 rounded-full bg-ai" /> V6 LEARNING JOURNEYS
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          A persisted path through observed learning
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Journeys extend existing V3/V4 learning evidence with concepts, prerequisite gaps,
          practice, revision schedules, and progress. Empty fields remain empty rather than becoming
          invented mastery percentages.
        </p>
      </header>
      {canEdit ? (
        <section className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-ai-soft text-ai">
              <Icons.Route className="size-4" />
            </span>
            <h2 className="font-bold">Save a teacher-reviewed journey</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="Student ID"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={nextConcept}
              onChange={(event) => setNextConcept(event.target.value)}
              placeholder="Recommended next concept"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <Button
            className="mt-3"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || studentId.trim().length < 1 || subject.trim().length < 1
            }
          >
            {saveMutation.isPending ? "Saving…" : "Save journey"}
          </Button>
          {saveMutation.error ? (
            <p className="mt-3 text-sm text-danger">{(saveMutation.error as Error).message}</p>
          ) : null}
        </section>
      ) : null}
      <section className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Journey records</h2>
          <Badge variant="outline">{journeys.data?.length ?? 0} persisted</Badge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(
            journeys.data as
              | Array<{
                  id: string;
                  student_name?: string;
                  subject: string;
                  recommended_next_concept: string;
                  prerequisite_gaps: unknown[];
                  recommended_practice: unknown[];
                  revision_schedule: unknown[];
                  status: string;
                }>
              | undefined
          )?.map((journey) => (
            <div key={journey.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{journey.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {journey.student_name ?? "Your learning journey"}
                  </p>
                </div>
                <Badge variant="outline">{journey.status}</Badge>
              </div>
              <p className="mt-3 text-sm">
                <span className="font-semibold">Next concept:</span>{" "}
                {journey.recommended_next_concept || "Not specified"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Prerequisite gaps: {journey.prerequisite_gaps?.length ?? 0}</span>
                <span>Practice items: {journey.recommended_practice?.length ?? 0}</span>
                <span>Revision entries: {journey.revision_schedule?.length ?? 0}</span>
              </div>
            </div>
          ))}
          {!journeys.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No learning journeys are persisted for this school or student yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
