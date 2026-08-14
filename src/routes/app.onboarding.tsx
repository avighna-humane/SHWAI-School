import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOnboardingState,
  updateSchoolSettings,
  completeOnboardingStep,
} from "@/actions/onboarding";
import { createInvitation, listInvitations, revokeInvitation } from "@/actions/invitations";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({ component: OnboardingPage });

const STEPS = [
  ["school_profile", "School profile"],
  ["academic_setup", "Academic setup"],
  ["people_setup", "People and invitations"],
  ["data_import", "Data import"],
  ["operational_ready", "Operational readiness"],
] as const;

type FormState = {
  name: string;
  timezone: string;
  country: string;
  currency: string;
  gradingSystem: "percentage" | "gpa" | "letter" | "custom";
  curriculum: string;
  language: string;
};

function OnboardingPage() {
  const { role, schoolId } = useAppState();
  const queryClient = useQueryClient();
  const state = useQuery({
    queryKey: ["onboarding-state", schoolId],
    queryFn: () => getOnboardingState(),
    enabled: Boolean(schoolId) && ["owner", "principal", "admin"].includes(role),
  });
  const invitations = useQuery({
    queryKey: ["school-invitations", schoolId],
    queryFn: () => listInvitations(),
    enabled: Boolean(schoolId) && ["owner", "principal", "admin"].includes(role),
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "teacher" as "student" | "teacher" | "parent" | "staff" | "admin" | "principal",
    targetEntityId: "",
  });
  const [form, setForm] = useState<FormState>({
    name: "",
    timezone: "Asia/Kolkata",
    country: "IN",
    currency: "INR",
    gradingSystem: "percentage",
    curriculum: "",
    language: "en",
  });
  useEffect(() => {
    if (!state.data) return;
    setForm({
      name: state.data.name,
      timezone: state.data.timezone,
      country: state.data.country,
      currency: state.data.currency,
      gradingSystem: state.data.grading_system as FormState["gradingSystem"],
      curriculum: state.data.curriculum,
      language: state.data.language,
    });
  }, [state.data]);
  const invite = useMutation({
    mutationFn: () => createInvitation({ data: inviteForm }),
    onSuccess: (result) => {
      toast.success(
        result.delivery === "sent"
          ? "Invitation sent"
          : "Invitation recorded; email provider configuration is required",
      );
      setInviteForm((old) => ({ ...old, email: "", targetEntityId: "" }));
      void queryClient.invalidateQueries({ queryKey: ["school-invitations", schoolId] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding-state", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvitation({ data: { id } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["school-invitations", schoolId] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const save = useMutation({
    mutationFn: () => updateSchoolSettings({ data: form }),
    onSuccess: () => {
      toast.success("School settings saved");
      void queryClient.invalidateQueries({ queryKey: ["onboarding-state", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const complete = useMutation({
    mutationFn: (step: (typeof STEPS)[number][0]) => completeOnboardingStep({ data: { step } }),
    onSuccess: (result) => {
      toast.success(result.completed ? "Onboarding complete" : "Onboarding step recorded");
      void queryClient.invalidateQueries({ queryKey: ["onboarding-state", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!["owner", "principal", "admin"].includes(role)) {
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        School onboarding is restricted to school leadership.
      </div>
    );
  }
  if (state.isLoading)
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        Loading onboarding state…
      </div>
    );
  if (state.isError || !state.data)
    return (
      <div className="surface-panel p-6 text-sm text-danger">
        Onboarding state could not be loaded. Check PostgreSQL configuration.
      </div>
    );

  const currentIndex = Math.max(
    0,
    STEPS.findIndex(([id]) => id === state.data.onboarding_step),
  );
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          School setup
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Production onboarding</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Configure the tenant, complete prerequisites, invite real members, and verify imported
          records before the school is marked operational. This workflow persists to the
          authenticated school context.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-5">
        {STEPS.map(([id, label], index) => (
          <div
            key={id}
            className={`rounded-xl border p-3 ${index <= currentIndex ? "border-primary/40 bg-primary-soft" : "border-border bg-card"}`}
          >
            <p className="text-xs font-semibold">
              {index + 1}. {label}
            </p>
            <Badge variant="secondary" className="mt-2 text-[10px]">
              {index < currentIndex ? "Complete" : index === currentIndex ? "Current" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
      <section className="surface-panel space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">School profile and defaults</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These values are server-controlled and are not stored in local browser preferences.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="school-name">School name</Label>
            <Input
              id="school-name"
              value={form.name}
              onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={form.timezone}
              onChange={(event) => setForm((old) => ({ ...old, timezone: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country code</Label>
            <Input
              id="country"
              maxLength={2}
              value={form.country}
              onChange={(event) => setForm((old) => ({ ...old, country: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              maxLength={3}
              value={form.currency}
              onChange={(event) => setForm((old) => ({ ...old, currency: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="curriculum">Curriculum</Label>
            <Input
              id="curriculum"
              value={form.curriculum}
              onChange={(event) => setForm((old) => ({ ...old, curriculum: event.target.value }))}
              placeholder="CBSE, ICSE, State board…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grading">Grading system</Label>
            <select
              id="grading"
              value={form.gradingSystem}
              onChange={(event) =>
                setForm((old) => ({
                  ...old,
                  gradingSystem: event.target.value as FormState["gradingSystem"],
                }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="gpa">GPA</option>
              <option value="letter">Letter</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save school settings"}
          </Button>
          <Button
            variant="outline"
            onClick={() => complete.mutate("school_profile")}
            disabled={complete.isPending}
          >
            Complete profile step
          </Button>
        </div>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Invite members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitations are single-use, school-scoped, role-bound, rate-limited, audited, and only
            delivered when an email provider is configured. Student invitations must include the
            persisted student record ID.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((old) => ({ ...old, email: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={inviteForm.role}
              onChange={(event) =>
                setInviteForm((old) => ({
                  ...old,
                  role: event.target.value as typeof inviteForm.role,
                }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="principal">Principal</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-target">Linked record ID</Label>
            <Input
              id="invite-target"
              value={inviteForm.targetEntityId}
              onChange={(event) =>
                setInviteForm((old) => ({ ...old, targetEntityId: event.target.value }))
              }
              placeholder="Required for students"
            />
          </div>
        </div>
        <Button onClick={() => invite.mutate()} disabled={invite.isPending || !inviteForm.email}>
          {invite.isPending ? "Creating…" : "Create invitation"}
        </Button>
        <div className="space-y-2">
          {(invitations.data ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <span>
                <strong>{item.email}</strong> · {item.role} · {item.status}
              </span>
              {item.status === "pending" ? (
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(item.id)}>
                  Revoke
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Readiness evidence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prerequisites are counted from school-scoped persisted records. Missing prerequisites
            block progression instead of being marked complete.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Academic years" value={state.data.academic_years} />
          <Metric label="Classes" value={state.data.classes} />
          <Metric label="Sections" value={state.data.sections} />
          <Metric label="Subjects" value={state.data.subjects} />
          <Metric label="Students" value={state.data.students} />
          <Metric label="Teachers" value={state.data.teachers} />
          <Metric label="Parents" value={state.data.parents} />
          <Metric label="Pending invitations" value={state.data.pending_invitations} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STEPS.slice(1).map(([id, label]) => (
            <Button
              key={id}
              variant="outline"
              onClick={() => complete.mutate(id)}
              disabled={complete.isPending}
            >{`Record ${label.toLowerCase()}`}</Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
