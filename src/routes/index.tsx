import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  GraduationCap,
  BookOpen,
  Users,
  Building,
  Sparkles,
  Calendar,
  LineChart,
  CheckCircle2,
  LayoutDashboard,
  NotebookPen,
  ClipboardCheck,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Info,
  BarChart3,
  Clock,
  Check,
  UserRound,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";

function DashboardPreview() {
  return (
    <div className="w-full text-left rounded-2xl border border-border bg-[#f8fafc] p-4 sm:p-6 shadow-elevated">
      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SHWAI Logo" className="h-5.5 object-contain" />
          <span className="text-[#475569] text-base select-none">•</span>
          <span className="text-[#334155] font-semibold text-sm tracking-tight select-none">Administration Panel</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#475569]">
          <span className="font-medium bg-card px-2.5 py-1 rounded-md border border-border text-[11px]">
            Thursday, Oct 26, 2023
          </span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-muted-foreground">
              <UserRound className="size-4" />
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold shadow-sm transition-all duration-200">
              <Check className="size-3.5" /> Mark Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-6 border-b border-border/60 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <span className="text-sm font-bold text-[#0f172a] border-b-2 border-[#0f172a] pb-3 -mb-3 whitespace-nowrap">Dashboard</span>
        <span className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors pb-3 -mb-3 cursor-pointer whitespace-nowrap">Schedule</span>
        <span className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors pb-3 -mb-3 cursor-pointer whitespace-nowrap">Students</span>
        <span className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors pb-3 -mb-3 cursor-pointer whitespace-nowrap">Faculty</span>
        <span className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors pb-3 -mb-3 cursor-pointer whitespace-nowrap">Grades</span>
        <span className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors pb-3 -mb-3 cursor-pointer whitespace-nowrap">Analytics</span>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Today's Class Schedule */}
        <div className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Today's Class Schedule</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5">October 26, 2023</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-soft text-primary">
                <Calendar className="size-4" />
              </div>
            </div>
            
            <p className="text-xs font-semibold text-[#475569] mb-4">08:00 - 15:30</p>
            
            {/* Timeline */}
            <div className="relative pl-6 border-l border-border/80 space-y-4 py-1">
              {/* Mathematics */}
              <div className="relative">
                <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-primary border-4 border-card" />
                <div className="bg-[#f8fafc] border border-border/80 rounded-lg p-3 text-xs flex flex-col gap-1 transition-all duration-200 hover:border-primary/30 hover:bg-primary-soft/10">
                  <div className="flex items-center justify-between font-bold text-[#0f172a]">
                    <span>08:30 Mathematics</span>
                    <span className="text-[10px] text-[#64748b] font-normal">Room 201</span>
                  </div>
                  <span className="text-[#64748b]">Mr. J. Davis</span>
                </div>
              </div>

              {/* Physics */}
              <div className="relative">
                <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-primary border-4 border-card" />
                <div className="bg-[#f8fafc] border border-border/80 rounded-lg p-3 text-xs flex flex-col gap-1 transition-all duration-200 hover:border-primary/30 hover:bg-primary-soft/10">
                  <div className="flex items-center justify-between font-bold text-[#0f172a]">
                    <span>09:45 Physics</span>
                    <span className="text-[10px] text-[#64748b] font-normal">Lab 3</span>
                  </div>
                  <span className="text-[#64748b]">Ms. E. Smith</span>
                </div>
              </div>

              {/* History */}
              <div className="relative">
                <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-primary border-4 border-card" />
                <div className="bg-[#f8fafc] border border-border/80 rounded-lg p-3 text-xs flex flex-col gap-1 transition-all duration-200 hover:border-primary/30 hover:bg-primary-soft/10">
                  <div className="flex items-center justify-between font-bold text-[#0f172a]">
                    <span>11:00 History</span>
                    <span className="text-[10px] text-[#64748b] font-normal">Room 104</span>
                  </div>
                  <span className="text-[#64748b]">Mr. R. Garcia</span>
                </div>
              </div>

              {/* English Lit. */}
              <div className="relative">
                <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-primary border-4 border-card" />
                <div className="bg-[#f8fafc] border border-border/80 rounded-lg p-3 text-xs flex flex-col gap-1 transition-all duration-200 hover:border-primary/30 hover:bg-primary-soft/10">
                  <div className="flex items-center justify-between font-bold text-[#0f172a]">
                    <span>13:30 English Lit.</span>
                    <span className="text-[10px] text-[#64748b] font-normal">Room 302</span>
                  </div>
                  <span className="text-[#64748b]">Mrs. A. Patel</span>
                </div>
              </div>
            </div>
          </div>
          
          <button className="mt-5 w-full py-2 border border-border hover:bg-muted text-[#475569] font-medium text-xs rounded-lg transition-colors">
            View Full Schedule
          </button>
        </div>

        {/* Column 2: Student Attendance Trends */}
        <div className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Student Attendance Trends</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5">Overall Weekly Attendance</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-soft text-primary">
                <BarChart3 className="size-4" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold text-[#475569]">Week 42</span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-semibold cursor-pointer transition-colors shadow-sm">
                Week 42 <ChevronDown className="size-3" />
              </span>
            </div>

            {/* Attendance Bar Chart with Trend line */}
            <div className="relative h-44 flex items-end justify-between border-b border-border/80 pb-2 mt-4 px-2">
              {/* Y Axis Grid Lines */}
              <div className="absolute inset-x-0 top-0 border-t border-border/30 h-0 w-full" />
              <div className="absolute inset-x-0 top-[25%] border-t border-border/30 h-0 w-full" />
              <div className="absolute inset-x-0 top-[50%] border-t border-border/30 h-0 w-full" />
              <div className="absolute inset-x-0 top-[75%] border-t border-border/30 h-0 w-full" />

              {/* Bar 1 */}
              <div className="flex flex-col items-center gap-1 w-[14%] z-10">
                <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">94.2%</span>
                <div className="w-full bg-[#1e293b] hover:bg-[#0f172a] rounded-t-[3px] transition-colors animate-bar-scale" style={{ height: "110px" }} />
                <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">Oct 21-25</span>
              </div>

              {/* Bar 2 */}
              <div className="flex flex-col items-center gap-1 w-[14%] z-10">
                <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">94.2%</span>
                <div className="w-full bg-[#1e293b] hover:bg-[#0f172a] rounded-t-[3px] transition-colors animate-bar-scale delay-100" style={{ height: "110px" }} />
                <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">Oct 21</span>
              </div>

              {/* Bar 3 */}
              <div className="flex flex-col items-center gap-1 w-[14%] z-10">
                <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">94.2%</span>
                <div className="w-full bg-[#1e293b] hover:bg-[#0f172a] rounded-t-[3px] transition-colors animate-bar-scale delay-200" style={{ height: "110px" }} />
                <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">Oct 21-25</span>
              </div>

              {/* Bar 4 */}
              <div className="flex flex-col items-center gap-1 w-[14%] z-10">
                <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">94.2%</span>
                <div className="w-full bg-[#1e293b] hover:bg-[#0f172a] rounded-t-[3px] transition-colors animate-bar-scale delay-300" style={{ height: "110px" }} />
                <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">Oct 21-24</span>
              </div>

              {/* Bar 5 */}
              <div className="flex flex-col items-center gap-1 w-[14%] z-10">
                <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">94.2%</span>
                <div className="w-full bg-[#0f52ba]/80 hover:bg-[#0f52ba] rounded-t-[3px] transition-colors animate-bar-scale delay-400" style={{ height: "110px" }} />
                <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">Oct 21-25</span>
              </div>

              {/* SVG Trend Line Overlay */}
              <svg className="absolute inset-0 h-44 w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M 10 38 L 30 38 L 50 38 L 70 38 L 90 38" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="animate-svg-draw"
                />
              </svg>
              {/* Dots at connections */}
              <div className="absolute left-[10%] bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" />
              <div className="absolute left-[30%] bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" />
              <div className="absolute left-[50%] bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" />
              <div className="absolute left-[70%] bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" />
              <div className="absolute left-[90%] bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[9px] mt-4">
              <span className="flex items-center gap-1.5 text-[#64748b] font-medium">
                <span className="size-2 rounded-[2px] bg-[#1e293b]" /> Present
              </span>
              <span className="flex items-center gap-1.5 text-[#64748b] font-medium">
                <span className="size-2 rounded-[2px] bg-[#ef4444]" /> Absent
              </span>
              <span className="flex items-center gap-1.5 text-[#64748b] font-medium">
                <span className="size-2 rounded-[2px] bg-[#f59e0b]" /> Late
              </span>
            </div>
          </div>

          {/* Banner */}
          <div className="mt-5 p-3 rounded-lg bg-[#eff6ff] border border-[#bfdbfe]/40 text-[#1e40af] text-[11px] flex items-start gap-2">
            <Info className="size-4 shrink-0 mt-0.5 text-blue-500" />
            <p>Overall Attendance rate is stable. <strong>94.2%</strong></p>
          </div>
        </div>

        {/* Column 3: Academic Progress Overview */}
        <div className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Academic Progress Overview</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5">Progress Cards</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-soft text-primary">
                <GraduationCap className="size-4" />
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-4">
              {/* Emily Chen */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#bfdbfe] text-blue-800 font-bold text-xs flex items-center justify-center border border-blue-200">
                    EC
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#0f172a]">Emily Chen</h5>
                    <p className="text-[9px] text-[#64748b]">Grade 10 • GPA 3.9</p>
                    <p className="text-[9px] text-primary font-medium mt-0.5">Math A | Sci A-</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#0f172a] font-mono">96%</span>
                  <div className="h-1.5 w-20 rounded-full bg-[#f1f5f9] overflow-hidden mt-1.5">
                    <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress" style={{ width: "96%" }} />
                  </div>
                </div>
              </div>

              {/* Liam Wilson */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#fed7aa] text-orange-800 font-bold text-xs flex items-center justify-center border border-orange-200">
                    LW
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#0f172a]">Liam Wilson</h5>
                    <p className="text-[9px] text-[#64748b]">Grade 9 • GPA 3.4</p>
                    <p className="text-[9px] text-primary font-medium mt-0.5">Eng B+ | Hist B</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#0f172a] font-mono">82%</span>
                  <div className="h-1.5 w-20 rounded-full bg-[#f1f5f9] overflow-hidden mt-1.5">
                    <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress delay-100" style={{ width: "82%" }} />
                  </div>
                </div>
              </div>

              {/* Sophia Miller */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#fbcfe8] text-pink-800 font-bold text-xs flex items-center justify-center border border-pink-200">
                    SM
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#0f172a]">Sophia Miller</h5>
                    <p className="text-[9px] text-[#64748b]">Grade 11 • GPA 4.0</p>
                    <p className="text-[9px] text-primary font-medium mt-0.5">Math A+ | Phys A+</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#0f172a] font-mono">99%</span>
                  <div className="h-1.5 w-20 rounded-full bg-[#f1f5f9] overflow-hidden mt-1.5">
                    <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress delay-200" style={{ width: "99%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-muted-foreground border-t border-border/40 pt-4 mt-4 bg-muted/10 py-1.5 rounded-lg font-mono">
            * Illustrative Preview Data Only
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHWAI — A Unified School Operating System" },
      { name: "description", content: "A platform unifying school administration, academic workflows, parent communication, and supportive AI learning tools." },
      { property: "og:title", content: "SHWAI — A Unified School Operating System" },
      { property: "og:description", content: "Explore a unified platform for school operations, teacher support, and Socratic learning aids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<"school" | "student">("school");

  const handleRoleSelect = (selectedRole: string) => {
    try {
      const STORAGE_KEY = "shwai.demo.state";
      const raw = localStorage.getItem(STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : { schoolId: "sch-1", campusId: "cmp-1", yearId: "ay-2025", plan: "enterprise", locale: "en", offline: false, readIds: [] };
      state.role = selectedRole;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="SHWAI Logo" className="size-9 object-contain transition-transform duration-500 hover:rotate-[10deg]" />
          <div>
            <p className="text-sm font-bold tracking-tight">SHWAI</p>
            <p className="text-[11px] text-muted-foreground">School Operating System</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="transition-all duration-200">
            <Link to="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <a href="#role-selection">
              Open Platform <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </a>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-y border-border bg-card/45">
        <div className="grid-faint absolute inset-0 opacity-20" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary animate-fade-in-up">
            <Sparkles className="size-3.5" aria-hidden /> A Unified School Operating System
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl animate-fade-in-up delay-100">
            The unified platform for school management & learning
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground animate-fade-in-up delay-200">
            SHWAI is designed to bring academics, school operations, parent communication, and student learning support into a single, cohesive experience for your entire school community.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up delay-300">
            <Button asChild size="lg" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
              <a href="#role-selection">
                Explore the Platform <ArrowRight className="size-4" aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:bg-accent/20">
              <Link to="/pricing">View Pricing Plans</Link>
            </Button>
          </div>

          {/* Product Dashboard Visual */}
          <div className="mx-auto max-w-5xl mt-12 rounded-2xl border border-[#cbd5e1] shadow-elevated overflow-hidden bg-card animate-fade-in-up delay-400">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Core Concept Section */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Connecting classrooms and administration</h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              When school workflows are isolated, communication breaks down and workloads increase. SHWAI is designed to bridge these gaps by connecting daily administrative duties with academic feedback. 
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              This unified design helps school leaders coordinate enrollments, enables teachers to organize resources, assists parents in staying informed, and provides students with supportive learning pathways.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
              <h3 className="text-sm font-bold">Academics & Operations</h3>
              <p className="mt-1 text-xs text-muted-foreground">Manage timetables, homework assignments, and exams in one place.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
              <h3 className="text-sm font-bold">Structured Learning</h3>
              <p className="mt-1 text-xs text-muted-foreground">Support students inside and outside the classroom with step-by-step guidance.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
              <h3 className="text-sm font-bold">School Insights</h3>
              <p className="mt-1 text-xs text-muted-foreground">Keep track of school attendance trends, progress, and workload metrics.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
              <h3 className="text-sm font-bold">Clear Coordination</h3>
              <p className="mt-1 text-xs text-muted-foreground">Maintain open communication between parents, teachers, and coordinators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders Section — Refactored to Role Entry Selection */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border" id="role-selection">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Platform Access</span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">Select your workspace to enter</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            SHWAI is organized around distinct roles. Select a category below to explore the customized dashboards.
          </p>
        </div>

        {/* Primary Categories: SCHOOL vs STUDENT */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl bg-muted/80 p-1.5 border border-border/40 shadow-inner">
            <button
              onClick={() => setActiveCategory("school")}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeCategory === "school"
                  ? "bg-card text-[#0f172a] shadow-sm border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building className="size-4 shrink-0" />
              SCHOOL
            </button>
            <button
              onClick={() => setActiveCategory("student")}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeCategory === "student"
                  ? "bg-card text-[#0f172a] shadow-sm border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-4 shrink-0" />
              STUDENT
            </button>
          </div>
        </div>

        {/* Sub-Roles Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto justify-center">
          {activeCategory === "school" ? (
            <>
              {/* Principal */}
              <button
                onClick={() => handleRoleSelect("principal")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <ShieldCheck className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">Principal</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Access school-wide performance intelligence, monitor staff workloads, review early academic alerts, and manage institutional governance.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary border-t border-border/40 pt-4 w-full">
                  <span>Enter Principal Workspace</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>

              {/* Teacher */}
              <button
                onClick={() => handleRoleSelect("teacher")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <BookOpen className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">Teacher</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Manage daily class attendance registers, plan lessons with AI assistance, generate homework assignments, and log assessment grades.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary border-t border-border/40 pt-4 w-full">
                  <span>Enter Teacher Workspace</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>

              {/* Owner */}
              <button
                onClick={() => handleRoleSelect("owner")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Briefcase className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">Owner</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Track cross-campus attendance statistics, view multi-campus fee collections, review license usage, and monitor top-level operations.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary border-t border-border/40 pt-4 w-full">
                  <span>Enter Owner Workspace</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Student */}
              <button
                onClick={() => handleRoleSelect("student")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <GraduationCap className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">Student</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    View your daily class timetable schedule, check assigned homework deadlines, and access socratic AI study tutor help.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary border-t border-border/40 pt-4 w-full">
                  <span>Enter Student Workspace</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>

              {/* Parent */}
              <button
                onClick={() => handleRoleSelect("parent")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Users className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">Parent</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Check your ward's daily attendance records, track active school bus routes, review quarterly grade cards, and pay school fees.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary border-t border-border/40 pt-4 w-full">
                  <span>Enter Parent Workspace</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            </>
          )}
        </div>
      </section>

      {/* AI-Assisted Learning & Teacher Productivity */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Classroom Support</span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Supporting teaching prep and student learning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SHWAI includes features designed to assist teachers with resource preparation and scaffold student problem-solving outside the classroom.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground font-semibold">Teacher Resource Helpers:</strong> Assist in generating lesson outlines, drafting homework worksheets, and creating study guides, requiring final review and approval by the educator.
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground font-semibold">Socratic Learning Support:</strong> Helps students with difficult assignments by offering structured, progressive hints that prompt independent logical reasoning rather than giving direct answers.
                </p>
              </div>
            </div>
          </div>
          

          <div className="space-y-4">
            {/* Visual preview of Socratic Tutor interaction */}
            <div className="surface-panel p-5 bg-card/60 border border-border shadow-sm transition-all duration-300 hover:shadow-elevated">
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-3">Tutor Interaction Preview</p>
              <div className="space-y-2">
                <div className="rounded bg-muted/30 p-2.5 text-xs text-[#334155] border border-border/40">
                  <span className="font-semibold text-[#0f172a]">Student:</span> I'm stuck on finding the area of this sector.
                </div>
                <div className="rounded bg-primary-soft/50 p-2.5 text-xs text-[#0f172a] border border-primary-soft/80 animate-slide-up-fade delay-300">
                  <span className="font-semibold text-primary block mb-1">Socratic Assistant (Hint 1 of 5):</span>
                  <span className="text-[#334155] leading-relaxed">What fraction of a full circle represents this sector's angle? How does that angle compare to 360 degrees?</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Connected System</span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Designed to bring school workflows together</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            See how information moves through SHWAI to connect administrators, teachers, students, and parents.
          </p>
        </div>

        {/* Visual Progress Steps */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">01</div>
            <h4 className="text-sm font-bold">Operational Setup</h4>
            <p className="mt-1 text-xs text-muted-foreground">Administrators set up class cohorts, configure registers, and schedule timetables.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">02</div>
            <h4 className="text-sm font-bold">Classroom Instruction</h4>
            <p className="mt-1 text-xs text-muted-foreground">Teachers mark attendance, assign homework, and record test grades in the gradebook.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">03</div>
            <h4 className="text-sm font-bold">Student Progress</h4>
            <p className="mt-1 text-xs text-muted-foreground">Students view timetables, submit homework, and receive learning hints.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">04</div>
            <h4 className="text-sm font-bold">Insight & Support</h4>
            <p className="mt-1 text-xs text-muted-foreground">Teachers track grades and notice when a student requires targeted academic support.</p>
          </div>
        </div>
      </section>

      {/* Academic Insights Mockup section */}
      <section className="bg-muted/40 border-b border-border py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Academic Insights</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Visualizing student growth and needs</h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                SHWAI unifies operational records and academic milestones. It highlights key trends such as learning spikes, attendance indicators, and workload strain to let educators intervene early and effectively.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">1</div>
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground font-semibold">Simulated Records:</strong> Track grades, attendance metrics, and homework completions inside the interactive demo environment.</p>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">2</div>
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground font-semibold">Teacher Verification:</strong> Ensure human approval on high-stakes calls, keeping educators always in control of the software output.</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-7">
              {/* Illustrative Mockup Container */}
              <div className="surface-panel p-5 bg-card shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-elevated">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-destructive" />
                    <span className="size-2.5 rounded-full bg-warning" />
                    <span className="size-2.5 rounded-full bg-success" />
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">demo_insights_dashboard</span>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-mono font-medium text-muted-foreground">
                    Illustrative Demo Data
                  </span>
                </div>
                
                {/* Simulated Student Progress Row */}
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-center transition-all duration-300 hover:bg-muted/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Avg Attendance</p>
                      <p className="mt-1 text-lg font-bold text-numeric">94.2%</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-center transition-all duration-300 hover:bg-muted/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Homework Turn-In</p>
                      <p className="mt-1 text-lg font-bold text-numeric">88.5%</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-center transition-all duration-300 hover:bg-muted/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Early Alerts</p>
                      <p className="mt-1 text-lg font-bold text-numeric text-warning">3 Active</p>
                    </div>
                  </div>
                  
                  {/* Progress Bars Mockup */}
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground">Class Grade Distribution (Grade 9 — C)</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Grade Target (80%+)</span>
                          <span className="font-semibold font-mono">18 / 24 Students</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full animate-progress" style={{ width: "75%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Timely Homework Submissions</span>
                          <span className="font-semibold font-mono">21 / 24 Students</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-success rounded-full animate-progress delay-100" style={{ width: "87%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHWAI Roadmap Section */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Future Vision</span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">SHWAI Product Roadmap</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            A projection of how SHWAI is designed to evolve from core administration to intelligent support and long-term school intelligence.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground border border-border/40">
            <Info className="size-3.5 text-primary" /> Roadmap projections are conceptual plans and do not represent currently active features.
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="relative">
          {/* Central Line for desktops */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border/80 -translate-x-1/2 hidden md:block" aria-hidden />

          <div className="space-y-12 relative">
            {/* Phase 1: V1–V2 — Starter */}
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative">
              {/* Point Indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 size-4 rounded-full bg-primary border-4 border-background hidden md:block z-10" />
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-bold text-[#475569] border border-border">V1–V2</span>
                  <span className="rounded bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-primary border border-blue-100">Starter Core</span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] mb-2">Foundational School Workflows</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Establishing the baseline operational register, schedule setup, and secure dashboards for basic class tracking and parent coordination.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted-foreground border-t border-[#e2e8f0]/60 pt-4">
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Student & School Information</span>
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Timetables & Scheduling</span>
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Registers & Attendance</span>
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Basic Portals & Reports</span>
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Homework & Assessments</span>
                  <span className="flex items-center gap-1.5"><Check className="size-3 text-primary shrink-0" /> Family Communication</span>
                </div>
              </div>
              
              {/* Space Column for visual layout */}
              <div className="hidden md:block" />
            </div>

            {/* Phase 2: V3–V4 — Professional */}
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative">
              {/* Point Indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 size-4 rounded-full bg-primary border-4 border-background hidden md:block z-10" />
              
              {/* Space Column for visual layout */}
              <div className="hidden md:block" />
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-bold text-[#475569] border border-border">V3–V4</span>
                  <span className="rounded bg-[#fdf2f8] px-2 py-0.5 text-[10px] font-semibold text-pink-700 border border-pink-100">Professional</span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] mb-2">Intelligent Learning & Productivity</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Introducing structured tutor scaffolding and content helpers designed to alleviate teacher prep burdens and support individual concept acquisition.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted-foreground border-t border-[#e2e8f0]/60 pt-4">
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> AI-Generated Content</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> Weak-Concept Diagnosis</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> Guided AI Student Support</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> Student Intervention Alerts</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> Teacher Planning Assistance</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-pink-500 shrink-0" /> Actionable Admin Insights</span>
                </div>
              </div>
            </div>

            {/* Phase 3: V5–V6 — Enterprise AI */}
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative">
              {/* Point Indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 size-4 rounded-full bg-primary border-4 border-background hidden md:block z-10" />
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-bold text-[#475569] border border-border">V5–V6</span>
                  <span className="rounded bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">Enterprise AI</span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] mb-2">Advanced Operations & Institutional Intelligence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Expanding the scope to broad institutional coordination, offline availability, compliance safeguards, and predictive data mapping for senior administration.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted-foreground border-t border-[#e2e8f0]/60 pt-4">
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Admissions, Fees & Transport</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Offline & Multilingual Support</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Decision & Resource Simulation</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Strict AI Governance Protocols</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Teacher Workload Optimization</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Career & Curriculum Insights</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Intervention Effectiveness</span>
                  <span className="flex items-center gap-1.5"><Building className="size-3 text-emerald-600 shrink-0" /> Future Risk & Resource Planning</span>
                </div>
              </div>
              
              {/* Space Column for visual layout */}
              <div className="hidden md:block" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Modules Grid */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Major platform modules</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            A comprehensive set of tools mapped to core school requirements.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75">
            <LayoutDashboard className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Role Dashboards</h4>
              <p className="mt-1 text-xs text-muted-foreground">Tailored interfaces showing schedule summaries and notifications.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75">
            <NotebookPen className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Academics & Homework</h4>
              <p className="mt-1 text-xs text-muted-foreground">Build assignments, check progress, and log gradebook marks.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75">
            <Calendar className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Timetables & Registers</h4>
              <p className="mt-1 text-xs text-muted-foreground">Daily attendance logs, cohort rosters, and timetable calendars.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75">
            <ShieldCheck className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Portal Access Controls</h4>
              <p className="mt-1 text-xs text-muted-foreground">Structured user accounts and permissions for parent-teacher integrity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Overview */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight">Flexible plans for school growth</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review SHWAI's available pricing tiers and plan options.
            </p>
          </div>
          
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <article key={p.id} className="surface-panel flex flex-col p-6 justify-between bg-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-elevated">
                <div>
                  <p className="text-sm font-semibold text-primary">{p.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.versions}</p>
                  <p className="mt-4 text-2xl font-bold text-numeric">
                    ₹{p.priceMin}–{p.priceMax}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.priceUnit}</p>
                  <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{p.tagline}</p>
                </div>
                <Button asChild variant={p.highlight ? "default" : "outline"} className="mt-6 w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                  <Link to="/pricing">Compare Features</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to simplify your school's workflows?</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
          Explore the SHWAI platform demo to see how we bring administration, class grading, student learning, and parent updates together.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
            <a href="#role-selection">Explore the Platform Demo</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:bg-accent/20">
            <Link to="/pricing">Compare Plan Features</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        <p>© AUSPPA — Built for learners, by learners</p>
      </footer>
    </div>
  );
}
