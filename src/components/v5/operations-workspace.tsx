import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import * as Icons from "lucide-react";
import {
  createAdmissionApplication,
  getV5OperationsSummary,
  listAdmissions,
  listFacilities,
  listFeeAccounts,
  listInventory,
  listLibrary,
  listTransportRoutes,
  listV5ProviderConfigs,
} from "@/actions/operations";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OperationsWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["v5-operations-summary", schoolId],
    queryFn: () => getV5OperationsSummary(),
    enabled: Boolean(schoolId),
  });
  const admissions = useQuery({
    queryKey: ["v5-admissions", schoolId],
    queryFn: () => listAdmissions(),
    enabled: Boolean(schoolId) && role !== "student" && role !== "parent",
  });
  const fees = useQuery({
    queryKey: ["v5-fees", schoolId],
    queryFn: () => listFeeAccounts(),
    enabled: Boolean(schoolId),
  });
  const transport = useQuery({
    queryKey: ["v5-transport", schoolId],
    queryFn: () => listTransportRoutes(),
    enabled: Boolean(schoolId),
  });
  const library = useQuery({
    queryKey: ["v5-library", schoolId],
    queryFn: () => listLibrary(),
    enabled: Boolean(schoolId),
  });
  const inventory = useQuery({
    queryKey: ["v5-inventory", schoolId],
    queryFn: () => listInventory(),
    enabled: Boolean(schoolId) && role !== "student" && role !== "parent",
  });
  const facilities = useQuery({
    queryKey: ["v5-facilities", schoolId],
    queryFn: () => listFacilities(),
    enabled: Boolean(schoolId) && role !== "student" && role !== "parent",
  });
  const providers = useQuery({
    queryKey: ["v5-provider-configs", schoolId],
    queryFn: () => listV5ProviderConfigs(),
    enabled: Boolean(schoolId) && ["admin", "principal", "owner"].includes(role),
  });
  const [applicantName, setApplicantName] = useStateValue("");
  const [guardianName, setGuardianName] = useStateValue("");
  const [grade, setGrade] = useStateValue("");
  const applicationMutation = useMutation({
    mutationFn: () =>
      createAdmissionApplication({
        data: {
          applicantName,
          guardianName,
          gradeRequested: grade ? Number(grade) : null,
          campusId: null,
          academicYearId: null,
        },
      }),
    onSuccess: () => {
      setApplicantName("");
      setGuardianName("");
      setGrade("");
      void queryClient.invalidateQueries({ queryKey: ["v5-admissions", schoolId] });
    },
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> V5 ENTERPRISE OPERATIONS
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">School operating system</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Persisted admissions, fee records, transport events, library circulation, inventory,
          facilities, and provider configuration boundaries. External services never report success
          without configuration and verification.
        </p>
      </header>
      {summary.isError ? <Notice text={(summary.error as Error).message} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Admissions"
          value={countSummary(summary.data?.admissions)}
          icon={<Icons.UserPlus className="size-4" />}
        />
        <Metric
          label="Fee accounts"
          value={countSummary(summary.data?.fees)}
          icon={<Icons.ReceiptIndianRupee className="size-4" />}
        />
        <Metric
          label="Transport routes"
          value={String(summary.data?.transport?.[0]?.routes ?? 0)}
          icon={<Icons.Bus className="size-4" />}
        />
        <Metric
          label="Reorder alerts"
          value={String(summary.data?.inventory?.[0]?.reorder_alerts ?? 0)}
          icon={<Icons.PackageCheck className="size-4" />}
        />
      </div>
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-panel p-5 sm:p-6">
          <SectionTitle
            icon={<Icons.UserPlus className="size-4" />}
            eyebrow="Admissions pipeline"
            title="Human-reviewed applications"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={applicantName}
              onChange={(event) => setApplicantName(event.target.value)}
              placeholder="Applicant name"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={guardianName}
              onChange={(event) => setGuardianName(event.target.value)}
              placeholder="Guardian name"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="Grade"
              inputMode="numeric"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <Button
            className="mt-3"
            onClick={() => applicationMutation.mutate()}
            disabled={applicationMutation.isPending || applicantName.trim().length < 2}
          >
            {applicationMutation.isPending ? "Creating…" : "Create application"}
          </Button>
          {applicationMutation.isError ? (
            <p className="mt-2 text-sm text-danger">
              {(applicationMutation.error as Error).message}
            </p>
          ) : null}
          <div className="mt-5 space-y-2">
            {(
              admissions.data as
                | Array<{
                    id: string;
                    applicant_name: string;
                    guardian_name: string;
                    status: string;
                    grade_requested: number | null;
                  }>
                | undefined
            )
              ?.slice(0, 6)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.applicant_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.guardian_name || "Guardian not recorded"} · Grade{" "}
                      {item.grade_requested ?? "—"}
                    </p>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
              ))}
            {!admissions.data?.length && !admissions.isLoading ? (
              <p className="text-sm text-muted-foreground">No persisted applications yet.</p>
            ) : null}
          </div>
        </div>
        <div className="surface-panel p-5 sm:p-6">
          <SectionTitle
            icon={<Icons.Settings2 className="size-4" />}
            eyebrow="External boundaries"
            title="Provider configuration"
          />
          <div className="mt-4 space-y-2">
            {(
              providers.data as
                | Array<{ provider_type: string; configuration_status: string; enabled: boolean }>
                | undefined
            )?.map((provider) => (
              <div
                key={provider.provider_type}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <span className="text-sm font-medium">{provider.provider_type}</span>
                <Badge variant="outline">{provider.configuration_status}</Badge>
              </div>
            ))}
            <p className="pt-2 text-xs leading-5 text-muted-foreground">
              Payment, GPS, SMS, WhatsApp, payroll, storage, and translation integrations remain
              explicitly configuration-dependent.
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <DataPanel
          title="Fee accounts"
          icon={<Icons.ReceiptIndianRupee className="size-4" />}
          rows={
            fees.data as
              | Array<{
                  id: string;
                  student_name: string;
                  fee_name: string;
                  status: string;
                  paid_total: number;
                }>
              | undefined
          }
          render={(row) => (
            <>
              <span className="font-medium">{row.student_name}</span>
              <span className="text-muted-foreground">
                {row.fee_name} · paid {row.paid_total ?? 0}
              </span>
              <Badge variant="outline">{row.status}</Badge>
            </>
          )}
        />
        <DataPanel
          title="Transport routes"
          icon={<Icons.Bus className="size-4" />}
          rows={
            transport.data as
              | Array<{
                  id: string;
                  name: string;
                  assigned_students: number;
                  provider_state: string;
                }>
              | undefined
          }
          render={(row) => (
            <>
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground">{row.assigned_students} students</span>
              <span className="text-xs text-muted-foreground">{row.provider_state}</span>
            </>
          )}
        />
        <DataPanel
          title="Library circulation"
          icon={<Icons.Library className="size-4" />}
          rows={
            library.data as
              | Array<{ id: string; title: string; available_copies: number; copies: number }>
              | undefined
          }
          render={(row) => (
            <>
              <span className="font-medium">{row.title}</span>
              <span className="text-muted-foreground">
                {row.available_copies}/{row.copies} available
              </span>
            </>
          )}
        />
        <DataPanel
          title="Inventory and facilities"
          icon={<Icons.Wrench className="size-4" />}
          rows={
            inventory.data as
              | Array<{ id: string; name: string; quantity: number; reorder_alert: boolean }>
              | undefined
          }
          render={(row) => (
            <>
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground">Quantity {row.quantity}</span>
              {row.reorder_alert ? (
                <Badge className="bg-warning-soft text-warning-foreground">Reorder</Badge>
              ) : null}
            </>
          )}
        />
      </section>
      {facilities.data?.length ? (
        <section className="surface-panel p-5">
          <SectionTitle
            icon={<Icons.Wrench className="size-4" />}
            eyebrow="Facilities"
            title="Maintenance queue"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              facilities.data as unknown as Array<{
                id: string;
                title: string;
                status: string;
                room_name: string | null;
              }>
            )
              .slice(0, 6)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.room_name ?? "Room not assigned"}
                  </p>
                  <Badge className="mt-2" variant="outline">
                    {item.status}
                  </Badge>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
function useStateValue(initial: string) {
  const [value, setValue] = React.useState(initial);
  return [value, setValue] as const;
}
function countSummary(value: unknown) {
  return Array.isArray(value)
    ? value.reduce((sum, row) => sum + Number((row as { count?: number }).count ?? 0), 0)
    : 0;
}
function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
      {text}
    </div>
  );
}
function SectionTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-bold">{title}</h2>
      </div>
    </div>
  );
}
function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="metric-panel p-4">
      <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
function DataPanel<T extends { id: string }>({
  title,
  icon,
  rows,
  render,
}: {
  title: string;
  icon: React.ReactNode;
  rows?: T[];
  render: (row: T) => React.ReactNode;
}) {
  return (
    <section className="surface-panel p-5">
      <SectionTitle icon={icon} eyebrow="Persisted records" title={title} />
      <div className="mt-4 space-y-2">
        {rows?.slice(0, 8).map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
          >
            {render(row)}
          </div>
        ))}
        {!rows?.length ? (
          <p className="text-sm text-muted-foreground">No persisted records yet.</p>
        ) : null}
      </div>
    </section>
  );
}
