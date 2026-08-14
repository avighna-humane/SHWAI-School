import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAppState } from "@/app/providers/app-state";
import { listStudents, type StudentRecord } from "@/actions/people";
import { PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/students")({ component: StudentsPage });

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function hsl(name: string) {
  let hue = 0;
  for (const character of name) hue = (hue * 31 + character.charCodeAt(0)) % 360;
  return `hsl(${hue},60%,55%)`;
}

function StudentsPage() {
  const { role, schoolId } = useAppState();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const canView = ["student", "parent", "teacher", "staff", "principal", "admin", "owner"].includes(
    role,
  );
  const query = useQuery({
    queryKey: ["students", schoolId, role, search],
    queryFn: () => listStudents({ data: { search: search || undefined, status: "active" } }),
    enabled: canView && Boolean(schoolId) && typeof window !== "undefined",
  });
  const students = useMemo(() => query.data ?? [], [query.data]);

  if (!canView) return <PermissionDenied role={ROLE_LABEL[role]} />;

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          V1 people directory
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Students</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          School-scoped student records. Visibility is resolved by the authenticated membership:
          students see themselves, parents see linked children, teachers see assigned classes, and
          administrators see the school directory.
        </p>
      </header>
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or admission number…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {query.data ? (
          <Badge variant="outline" className="rounded-full">
            {students.length} students
          </Badge>
        ) : null}
      </div>
      {query.isLoading ? (
        <div className="surface-panel flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          <Icons.Loader2 className="mr-2 size-5 animate-spin" />
          Loading persisted student records…
        </div>
      ) : query.isError ? (
        <div className="surface-panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <Icons.DatabaseZap className="size-10 text-danger/60" />
          <h2 className="mt-3 font-semibold">Student records are unavailable</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
            {(query.error as Error).message}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>
            <Icons.RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      ) : students.length === 0 ? (
        <div className="surface-panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <Icons.Users className="size-10 text-muted-foreground/40" />
          <h2 className="mt-3 font-semibold">No persisted students found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the V1 migration and create school records to populate this directory.
          </p>
        </div>
      ) : (
        <StudentTable
          students={students}
          onOpen={(id) => navigate({ to: "/app/students/$studentId", params: { studentId: id } })}
        />
      )}
    </div>
  );
}

function StudentTable({
  students,
  onOpen,
}: {
  students: StudentRecord[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {["Student", "Class", "Section", "Academic year", "Attendance"].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.slice(0, 500).map((student) => (
            <tr
              key={student.id}
              onClick={() => onOpen(student.id)}
              className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback
                      style={{ backgroundColor: hsl(student.name), color: "#fff" }}
                      className="text-xs font-bold"
                    >
                      {initials(student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.admission_no}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {student.class_label ?? "Unassigned"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{student.section_name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {student.academic_year_label ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                Attendance report available in Attendance
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length > 500 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Showing 500 of {students.length}. Refine your search to continue.
        </p>
      ) : null}
    </div>
  );
}
