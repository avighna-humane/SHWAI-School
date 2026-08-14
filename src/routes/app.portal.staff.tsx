import { createFileRoute, Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/portal/staff")({ component: StaffPortal });

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C className={className} aria-hidden />;
}

const PORTAL_CARDS = [
  {
    icon: "Megaphone",
    label: "Notices",
    description:
      "Create and publish school-wide notices. Target all students, specific classes, all teachers, specific teachers, or the entire school.",
    path: "/app/notices",
    primary: "Manage Notices",
    createPath: "/app/notices",
    badge: "New" as const,
    highlight: true,
    isNotices: true,
  },
  {
    icon: "GraduationCap",
    label: "Students",
    description: "Manage student profiles, track progress and interventions.",
    path: "/app/students",
    primary: "View Students",
  },
  {
    icon: "Presentation",
    label: "Teachers",
    description: "View teacher profiles, workload and support.",
    path: "/app/teachers",
    primary: "View Teachers",
  },
  {
    icon: "UserCheck",
    label: "Attendance",
    description: "Daily attendance marking, trends and analytics.",
    path: "/app/attendance",
    primary: "View Attendance",
  },
  {
    icon: "ChartSpline",
    label: "School Intelligence",
    description:
      "School-wide observed trends, evidence-backed alerts, intervention status and data quality.",
    path: "/app/intelligence/school",
    primary: "Open Intelligence",
  },
  {
    icon: "FileBarChart",
    label: "Reports",
    description: "Academic, attendance, teacher and school reports.",
    path: "/app/reports",
    primary: "View Reports",
  },
];

function StaffPortal() {
  const { user } = useAppState();

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI WORKSPACE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Staff Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {user.name}. Manage school operations, staff communication and student outcomes.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_CARDS.map((card) => (
          <div
            key={card.path}
            className={`flex flex-col rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md
              ${card.highlight ? "border-primary/30 bg-primary/5" : "bg-card"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`flex size-10 items-center justify-center rounded-lg
                ${card.highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                <Icon name={card.icon} className="size-5" />
              </div>
              {card.badge && (
                <Badge className="shrink-0 rounded-full bg-ai-soft px-2 text-[10px] text-ai">
                  {card.badge}
                </Badge>
              )}
            </div>

            <h2 className={`mt-3 text-base font-semibold ${card.highlight ? "text-primary" : ""}`}>
              {card.label}
            </h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{card.description}</p>

            <div className="mt-4 flex items-center gap-2">
              {"isNotices" in card && card.isNotices ? (
                <>
                  <Button asChild size="sm" variant="default" className="flex-1">
                    <Link to={card.path}>
                      <Icons.Plus className="mr-1.5 size-3.5" />+ Create Notice
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={card.path}>View All</Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to={card.path}>{card.primary}</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
