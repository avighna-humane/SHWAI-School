import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "schedule" | "students" | "attendance" | "academics" | "all"
  >("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "schedule" as const, label: "Schedule" },
    { id: "students" as const, label: "Students" },
    { id: "attendance" as const, label: "Attendance" },
    { id: "academics" as const, label: "Academics" },
    { id: "all" as const, label: "All" },
  ];

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
      <div className="flex items-center gap-0 border-b border-border/60 mb-6 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm px-4 pb-3 -mb-px whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "font-bold text-[#0f172a] border-[#0f172a]"
                : "font-medium text-[#64748b] border-transparent hover:text-[#0f172a] hover:border-[#cbd5e1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content — key forces remount so animate-slide-up-fade retriggers */}
      <div key={activeTab} className="animate-slide-up-fade">

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Col 1: Schedule */}
            <div className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Today's Class Schedule</h4>
                    <p className="text-[11px] text-[#64748b] mt-0.5">October 26, 2023</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary-soft text-primary"><Calendar className="size-4" /></div>
                </div>
                <p className="text-xs font-semibold text-[#475569] mb-4">08:00 – 15:30</p>
                <div className="relative pl-6 border-l border-border/80 space-y-4 py-1">
                  {[
                    { time: "08:30 Mathematics", room: "Room 201", teacher: "Mr. J. Davis" },
                    { time: "09:45 Physics",     room: "Lab 3",    teacher: "Ms. E. Smith" },
                    { time: "11:00 History",      room: "Room 104", teacher: "Mr. R. Garcia" },
                    { time: "13:30 English Lit.", room: "Room 302", teacher: "Mrs. A. Patel" },
                  ].map((c) => (
                    <div key={c.time} className="relative">
                      <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-primary border-4 border-card" />
                      <div className="bg-[#f8fafc] border border-border/80 rounded-lg p-3 text-xs flex flex-col gap-1 transition-all duration-200 hover:border-primary/30 hover:bg-primary-soft/10">
                        <div className="flex items-center justify-between font-bold text-[#0f172a]">
                          <span>{c.time}</span>
                          <span className="text-[10px] text-[#64748b] font-normal">{c.room}</span>
                        </div>
                        <span className="text-[#64748b]">{c.teacher}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="mt-5 w-full py-2 border border-border hover:bg-muted text-[#475569] font-medium text-xs rounded-lg transition-colors">
                View Full Schedule
              </button>
            </div>

            {/* Col 2: Attendance */}
            <div className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Student Attendance Trends</h4>
                    <p className="text-[11px] text-[#64748b] mt-0.5">Overall Weekly Attendance</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary-soft text-primary"><BarChart3 className="size-4" /></div>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-semibold text-[#475569]">Week 42</span>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-semibold cursor-pointer transition-colors shadow-sm">
                    Week 42 <ChevronDown className="size-3" />
                  </span>
                </div>
                <div className="relative h-44 flex items-end justify-between border-b border-border/80 pb-2 mt-4 px-2">
                  <div className="absolute inset-x-0 top-0    border-t border-border/30 h-0 w-full" />
                  <div className="absolute inset-x-0 top-[25%] border-t border-border/30 h-0 w-full" />
                  <div className="absolute inset-x-0 top-[50%] border-t border-border/30 h-0 w-full" />
                  <div className="absolute inset-x-0 top-[75%] border-t border-border/30 h-0 w-full" />
                  {[
                    { h: 110, label: "Oct 21", pct: "94.2%", hi: false },
                    { h: 104, label: "Oct 22", pct: "92.8%", hi: false },
                    { h: 116, label: "Oct 23", pct: "96.1%", hi: false },
                    { h: 100, label: "Oct 24", pct: "89.7%", hi: false },
                    { h: 110, label: "Oct 25", pct: "94.2%", hi: true  },
                  ].map((b, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 w-[14%] z-10">
                      <span className="text-[9px] font-bold text-[#0f172a] font-mono mb-0.5">{b.pct}</span>
                      <div
                        className={`w-full rounded-t-[3px] transition-colors animate-bar-scale ${b.hi ? "bg-[#0f52ba]/80 hover:bg-[#0f52ba]" : "bg-[#1e293b] hover:bg-[#0f172a]"}`}
                        style={{ height: `${b.h}px`, animationDelay: `${i * 100}ms` }}
                      />
                      <span className="text-[8px] text-[#64748b] font-mono mt-1 whitespace-nowrap">{b.label}</span>
                    </div>
                  ))}
                  <svg className="absolute inset-0 h-44 w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 10 38 L 30 40 L 50 34 L 70 44 L 90 38" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-svg-draw" />
                  </svg>
                  {[10, 30, 50, 70, 90].map((l) => (
                    <div key={l} className="absolute bottom-[110px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full bg-primary border border-white" style={{ left: `${l}%` }} />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 text-[9px] mt-4">
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#1e293b]" /> Present</span>
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#ef4444]" /> Absent</span>
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#f59e0b]" /> Late</span>
                </div>
              </div>
              <div className="mt-5 p-3 rounded-lg bg-[#eff6ff] border border-[#bfdbfe]/40 text-[#1e40af] text-[11px] flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5 text-blue-500" />
                <p>Overall attendance is stable at <strong>94.2%</strong> this week.</p>
              </div>
            </div>

            {/* Col 3: Academic Progress */}
            <div className="bg-card rounded-xl border border-border p-5 flex flex-col shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-[#0f172a] tracking-tight">Academic Progress</h4>
                  <p className="text-[11px] text-[#64748b] mt-0.5">Student Progress Cards</p>
                </div>
                <div className="p-2 rounded-lg bg-primary-soft text-primary"><GraduationCap className="size-4" /></div>
              </div>
              <div className="space-y-4">
                {[
                  { initials: "EC", bg: "bg-[#bfdbfe] text-blue-800 border-blue-200",   name: "Emily Chen",    grade: "Grade 10 • GPA 3.9", subjects: "Math A | Sci A-",    pct: 96, delay: "" },
                  { initials: "LW", bg: "bg-[#fed7aa] text-orange-800 border-orange-200", name: "Liam Wilson",   grade: "Grade 9 • GPA 3.4",  subjects: "Eng B+ | Hist B",   pct: 82, delay: "delay-100" },
                  { initials: "SM", bg: "bg-[#fbcfe8] text-pink-800 border-pink-200",    name: "Sophia Miller", grade: "Grade 11 • GPA 4.0", subjects: "Math A+ | Phys A+", pct: 99, delay: "delay-200" },
                ].map((s, i) => (
                  <div key={s.name} className={`flex items-center justify-between ${i < 2 ? "border-b border-border/40 pb-3" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-full ${s.bg} font-bold text-xs flex items-center justify-center border`}>{s.initials}</div>
                      <div>
                        <h5 className="text-xs font-bold text-[#0f172a]">{s.name}</h5>
                        <p className="text-[9px] text-[#64748b]">{s.grade}</p>
                        <p className="text-[9px] text-primary font-medium mt-0.5">{s.subjects}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#0f172a] font-mono">{s.pct}%</span>
                      <div className="h-1.5 w-20 rounded-full bg-[#f1f5f9] overflow-hidden mt-1.5">
                        <div className={`h-full bg-[#0f52ba]/80 rounded-full animate-progress ${s.delay}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULE ──────────────────────────────────────────── */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Today's Schedule</h4>
                <p className="text-[11px] text-[#64748b]">Thursday, October 26, 2023</p>
              </div>
              <span className="text-[11px] font-mono bg-primary-soft text-primary px-2.5 py-1 rounded-md font-semibold">08:00 – 15:30</span>
            </div>
            <div className="space-y-2.5">
              {[
                { start: "08:30", end: "09:30", subject: "Mathematics",        teacher: "Mr. J. Davis",   room: "Room 201", cls: "Grade 10-A", status: "done" },
                { start: "09:45", end: "10:45", subject: "Physics",            teacher: "Ms. E. Smith",   room: "Lab 3",    cls: "Grade 10-B", status: "done" },
                { start: "11:00", end: "12:00", subject: "History",            teacher: "Mr. R. Garcia",  room: "Room 104", cls: "Grade 9-A",  status: "active" },
                { start: "12:00", end: "13:00", subject: "Lunch Break",        teacher: "",               room: "Cafeteria", cls: "",          status: "break" },
                { start: "13:30", end: "14:30", subject: "English Literature", teacher: "Mrs. A. Patel",  room: "Room 302", cls: "Grade 11-A", status: "upcoming" },
                { start: "14:45", end: "15:30", subject: "Chemistry",          teacher: "Dr. K. Rao",     room: "Lab 1",    cls: "Grade 9-B",  status: "upcoming" },
              ].map((c) => (
                <div
                  key={c.start}
                  className={`flex items-start gap-4 p-3 rounded-xl border transition-all duration-200 ${
                    c.status === "active"   ? "bg-primary-soft/30 border-primary/30" :
                    c.status === "break"    ? "bg-muted/40 border-border/40" :
                    c.status === "done"     ? "bg-card border-border opacity-60" :
                    "bg-card border-border hover:border-primary/20 hover:shadow-sm"
                  }`}
                >
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-xs font-bold text-[#0f172a] font-mono">{c.start}</span>
                    <p className="text-[9px] text-[#64748b] font-mono">{c.end}</p>
                  </div>
                  <div className={`mt-1.5 w-0.5 h-8 rounded-full shrink-0 ${
                    c.status === "active"   ? "bg-primary" :
                    c.status === "break"    ? "bg-border" :
                    c.status === "done"     ? "bg-success" :
                    "bg-border/60"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-bold ${c.status === "break" ? "text-[#64748b]" : "text-[#0f172a]"}`}>{c.subject}</h4>
                      {c.status === "active"   && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white shrink-0">In Progress</span>}
                      {c.status === "done"     && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success shrink-0">Done</span>}
                      {c.status === "upcoming" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-[#64748b] border border-border shrink-0">Upcoming</span>}
                    </div>
                    {c.teacher
                      ? <p className="text-[11px] text-[#64748b] mt-0.5">{c.teacher} · {c.room} · {c.cls}</p>
                      : <p className="text-[11px] text-[#64748b] mt-0.5">{c.room}</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STUDENTS ──────────────────────────────────────────── */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Student Directory</h4>
                <p className="text-[11px] text-[#64748b]">All enrolled students — current term</p>
              </div>
              <span className="text-[11px] font-semibold text-[#475569] bg-muted px-2.5 py-1 rounded-md border border-border">552 Students</span>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="grid grid-cols-5 gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                <span className="col-span-2">Student</span>
                <span className="text-center">Attendance</span>
                <span className="text-center">GPA</span>
                <span className="text-center">Status</span>
              </div>
              {[
                { initials: "EC", bg: "bg-[#bfdbfe] text-blue-800 border-blue-200",     name: "Emily Chen",    cls: "Grade 10-A", att: 98, gpa: 3.9, ok: true },
                { initials: "LW", bg: "bg-[#fed7aa] text-orange-800 border-orange-200", name: "Liam Wilson",   cls: "Grade 9-B",  att: 82, gpa: 3.4, ok: true },
                { initials: "SM", bg: "bg-[#fbcfe8] text-pink-800 border-pink-200",     name: "Sophia Miller", cls: "Grade 11-A", att: 96, gpa: 4.0, ok: true },
                { initials: "AM", bg: "bg-[#d1fae5] text-emerald-800 border-emerald-200", name: "Arjun Mehta", cls: "Grade 10-B", att: 74, gpa: 3.1, ok: false },
                { initials: "MP", bg: "bg-[#e0e7ff] text-indigo-800 border-indigo-200", name: "Maya Patel",    cls: "Grade 9-A",  att: 91, gpa: 3.6, ok: true },
                { initials: "JR", bg: "bg-[#fef3c7] text-amber-800 border-amber-200",   name: "Jake Rivera",   cls: "Grade 11-B", att: 88, gpa: 3.3, ok: true },
              ].map((s, i) => (
                <div key={s.name} className={`grid grid-cols-5 gap-3 items-center px-4 py-3 transition-colors hover:bg-muted/20 ${i < 5 ? "border-b border-border/60" : ""}`}>
                  <div className="col-span-2 flex items-center gap-2.5">
                    <div className={`size-8 rounded-full ${s.bg} font-bold text-[11px] flex items-center justify-center border shrink-0`}>{s.initials}</div>
                    <div>
                      <p className="text-xs font-semibold text-[#0f172a]">{s.name}</p>
                      <p className="text-[10px] text-[#64748b]">{s.cls}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`text-xs font-bold font-mono ${s.att >= 90 ? "text-success" : s.att >= 80 ? "text-warning" : "text-danger"}`}>{s.att}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold font-mono text-[#0f172a]">{s.gpa.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-center">
                    {s.ok
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success">On Track</span>
                      : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning-soft text-warning">Alert</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ────────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Weekly Attendance</h4>
                <p className="text-[11px] text-[#64748b]">Week 42 · Oct 21–25, 2023</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Present", value: "423", cls: "text-success", bg: "bg-success-soft" },
                  { label: "Absent",  value: "31",  cls: "text-danger",  bg: "bg-danger-soft"  },
                  { label: "Late",    value: "18",  cls: "text-warning", bg: "bg-warning-soft" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                    <p className={`text-base font-bold font-mono ${s.cls}`}>{s.value}</p>
                    <p className="text-[10px] font-semibold text-[#64748b] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="relative h-36 flex items-end justify-between border-b border-border/80 pb-2 px-1">
                  {[
                    { h: 100, label: "Mon", pct: "94.2%", hi: false },
                    { h: 94,  label: "Tue", pct: "92.4%", hi: false },
                    { h: 108, label: "Wed", pct: "96.1%", hi: false },
                    { h: 88,  label: "Thu", pct: "89.7%", hi: false },
                    { h: 100, label: "Fri", pct: "94.2%", hi: true  },
                  ].map((b, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 w-[14%] z-10">
                      <span className="text-[8px] font-bold text-[#0f172a] font-mono mb-0.5">{b.pct}</span>
                      <div
                        className={`w-full rounded-t-[3px] transition-colors animate-bar-scale ${b.hi ? "bg-[#0f52ba]/80 hover:bg-[#0f52ba]" : "bg-[#1e293b] hover:bg-[#0f172a]"}`}
                        style={{ height: `${b.h}px`, animationDelay: `${i * 80}ms` }}
                      />
                      <span className="text-[8px] text-[#64748b] font-mono mt-1">{b.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 text-[9px] mt-3">
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#1e293b]" /> Present</span>
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#ef4444]" /> Absent</span>
                  <span className="flex items-center gap-1.5 text-[#64748b] font-medium"><span className="size-2 rounded-[2px] bg-[#f59e0b]" /> Late</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Attendance by Grade</h4>
                <p className="text-[11px] text-[#64748b]">This week's rate per grade level</p>
              </div>
              <div className="space-y-3">
                {[
                  { grade: "Grade 9",  rate: 94, students: 156 },
                  { grade: "Grade 10", rate: 92, students: 148 },
                  { grade: "Grade 11", rate: 96, students: 131 },
                  { grade: "Grade 12", rate: 91, students: 117 },
                ].map((g) => (
                  <div key={g.grade} className="bg-card rounded-lg border border-border p-3 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#0f172a]">{g.grade}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#64748b]">{g.students} students</span>
                        <span className="text-xs font-bold font-mono text-[#0f172a]">{g.rate}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress" style={{ width: `${g.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-[#eff6ff] border border-[#bfdbfe]/40 text-[#1e40af] text-[11px] flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5 text-blue-500" />
                <p>School-wide average is <strong>93.3%</strong> for Week 42.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── ACADEMICS ─────────────────────────────────────────── */}
        {activeTab === "academics" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Subject Performance</h4>
                <p className="text-[11px] text-[#64748b]">Class averages — Grade 9-C</p>
              </div>
              <div className="space-y-3">
                {[
                  { subject: "English Literature", teacher: "Mrs. A. Patel", avg: 91 },
                  { subject: "Mathematics",        teacher: "Mr. J. Davis",  avg: 87 },
                  { subject: "History",            teacher: "Mr. R. Garcia", avg: 84 },
                  { subject: "Physics",            teacher: "Ms. E. Smith",  avg: 79 },
                  { subject: "Chemistry",          teacher: "Dr. K. Rao",    avg: 76 },
                ].map((s, i) => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs font-semibold text-[#0f172a]">{s.subject}</span>
                        <span className="text-[10px] text-[#64748b] ml-2">{s.teacher}</span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${s.avg >= 85 ? "text-success" : s.avg >= 80 ? "text-[#0f172a]" : "text-warning"}`}>{s.avg}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div
                        className="h-full rounded-full animate-progress"
                        style={{ width: `${s.avg}%`, background: s.avg >= 85 ? "#22c55e" : s.avg >= 80 ? "#0f52ba" : "#f59e0b", animationDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Recent Assignments</h4>
                <p className="text-[11px] text-[#64748b]">Submission status this term</p>
              </div>
              <div className="space-y-3">
                {[
                  { title: "Math Problem Set 7",  subject: "Mathematics",     due: "Oct 28", submitted: 18, total: 24 },
                  { title: "Physics Lab Report",  subject: "Physics",         due: "Oct 27", submitted: 21, total: 24 },
                  { title: "History Essay Draft", subject: "History",         due: "Oct 30", submitted: 14, total: 24 },
                  { title: "English Commentary",  subject: "English Lit.",    due: "Nov 1",  submitted: 22, total: 24 },
                ].map((a) => (
                  <div key={a.title} className="bg-card rounded-lg border border-border p-3 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-semibold text-[#0f172a] leading-tight">{a.title}</p>
                        <p className="text-[10px] text-[#64748b] mt-0.5">{a.subject} · Due {a.due}</p>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-[#0f172a] shrink-0">{a.submitted}/{a.total}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress" style={{ width: `${(a.submitted / a.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALL ───────────────────────────────────────────────── */}
        {activeTab === "all" && (
          <div className="space-y-5">
            {/* Top: quick stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Students Enrolled", value: "552",   icon: <GraduationCap className="size-4" />, bg: "bg-primary-soft text-primary" },
                { label: "Attendance Rate",    value: "93.3%", icon: <BarChart3 className="size-4" />,     bg: "bg-success-soft text-success" },
                { label: "Active Classes",     value: "6",     icon: <Calendar className="size-4" />,     bg: "bg-info-soft text-info" },
                { label: "Assignments Due",    value: "4",     icon: <NotebookPen className="size-4" />,  bg: "bg-warning-soft text-warning" },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/20 transition-all duration-200 hover:shadow-sm">
                  <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">{s.value}</p>
                    <p className="text-[10px] text-[#64748b]">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Middle: today's classes + student highlights */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-card rounded-xl border border-border p-4">
                <h4 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5"><Calendar className="size-3.5 text-primary" /> Today's Classes</h4>
                <div className="space-y-2">
                  {[
                    { time: "08:30", subject: "Mathematics",        teacher: "Mr. J. Davis",  room: "Room 201", status: "done"     },
                    { time: "09:45", subject: "Physics",            teacher: "Ms. E. Smith",  room: "Lab 3",    status: "done"     },
                    { time: "11:00", subject: "History",            teacher: "Mr. R. Garcia", room: "Room 104", status: "active"   },
                    { time: "13:30", subject: "English Literature", teacher: "Mrs. A. Patel", room: "Room 302", status: "upcoming" },
                  ].map((c) => (
                    <div key={c.time} className={`flex items-center gap-3 p-2 rounded-lg text-xs transition-colors ${c.status === "active" ? "bg-primary-soft/30 border border-primary/20" : "hover:bg-muted/30"}`}>
                      <span className="font-mono font-bold text-[10px] text-[#475569] w-10 shrink-0">{c.time}</span>
                      <div className={`w-1 h-4 rounded-full shrink-0 ${c.status === "active" ? "bg-primary" : c.status === "done" ? "bg-success" : "bg-border"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[#0f172a] truncate block">{c.subject}</span>
                        <span className="text-[10px] text-[#64748b] truncate block">{c.teacher} · {c.room}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <h4 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5"><GraduationCap className="size-3.5 text-primary" /> Student Highlights</h4>
                <div className="space-y-2">
                  {[
                    { initials: "EC", bg: "bg-[#bfdbfe] text-blue-800 border-blue-200",       name: "Emily Chen",    detail: "Grade 10-A · GPA 3.9",          ok: true  },
                    { initials: "AM", bg: "bg-[#d1fae5] text-emerald-800 border-emerald-200", name: "Arjun Mehta",   detail: "Grade 10-B · 74% attendance",   ok: false },
                    { initials: "SM", bg: "bg-[#fbcfe8] text-pink-800 border-pink-200",       name: "Sophia Miller", detail: "Grade 11-A · GPA 4.0",          ok: true  },
                    { initials: "MP", bg: "bg-[#e0e7ff] text-indigo-800 border-indigo-200",   name: "Maya Patel",    detail: "Grade 9-A · 91% attendance",    ok: true  },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`size-7 rounded-full ${s.bg} font-bold text-[10px] flex items-center justify-center border shrink-0`}>{s.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0f172a] truncate">{s.name}</p>
                        <p className="text-[10px] text-[#64748b] truncate">{s.detail}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${s.ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                        {s.ok ? "✓" : "!"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: assignments + alerts */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-card rounded-xl border border-border p-4">
                <h4 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5"><NotebookPen className="size-3.5 text-primary" /> Pending Assignments</h4>
                <div className="space-y-2">
                  {[
                    { title: "Math Problem Set 7", submitted: 18, total: 24, due: "Oct 28" },
                    { title: "Physics Lab Report",  submitted: 21, total: 24, due: "Oct 27" },
                  ].map((a) => (
                    <div key={a.title} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#0f172a] truncate flex-1">{a.title}</span>
                        <span className="text-[10px] font-mono text-[#64748b] ml-2 shrink-0">{a.submitted}/{a.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-[#f1f5f9] overflow-hidden">
                          <div className="h-full bg-[#0f52ba]/80 rounded-full animate-progress" style={{ width: `${(a.submitted / a.total) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-[#64748b]">Due {a.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <h4 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5"><Info className="size-3.5 text-primary" /> School Alerts</h4>
                <div className="space-y-2">
                  {[
                    { msg: "Arjun Mehta's attendance is below 75%. Early support recommended.", type: "warning" },
                    { msg: "Physics Lab Report deadline is tomorrow. 3 submissions pending.",   type: "info"    },
                    { msg: "Grade 11-A achieved 96% attendance this week.",                     type: "success" },
                  ].map((a, i) => (
                    <div key={i} className={`p-2.5 rounded-lg text-[11px] border ${
                      a.type === "warning" ? "bg-warning-soft border-warning/20 text-warning-foreground" :
                      a.type === "info"    ? "bg-info-soft border-info/20 text-info" :
                      "bg-success-soft border-success/20 text-success"
                    }`}>
                      {a.msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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

  // Scroll-triggered reveal — one shared IntersectionObserver for all .reveal elements.
  // JS adds .js-hide so content is always visible if this effect never runs.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!els.length) return;
    els.forEach((el) => el.classList.add("js-hide"));
    if (!("IntersectionObserver" in window)) {
      // Fallback: reveal everything immediately
      els.forEach((el) => { el.classList.remove("js-hide"); el.classList.add("revealed"); });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
          <div className="reveal">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Connecting classrooms and administration</h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              When school workflows are isolated, communication breaks down and workloads increase. SHWAI is designed to bridge these gaps by connecting daily administrative duties with academic feedback. 
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              This unified design helps school leaders coordinate enrollments, enables teachers to organize resources, assists parents in staying informed, and provides students with supportive learning pathways.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 reveal-group">
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm reveal">
              <h3 className="text-sm font-bold">Academics & Operations</h3>
              <p className="mt-1 text-xs text-muted-foreground">Manage timetables, homework assignments, and exams in one place.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm reveal">
              <h3 className="text-sm font-bold">Structured Learning</h3>
              <p className="mt-1 text-xs text-muted-foreground">Support students inside and outside the classroom with step-by-step guidance.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm reveal">
              <h3 className="text-sm font-bold">School Insights</h3>
              <p className="mt-1 text-xs text-muted-foreground">Keep track of school attendance trends, progress, and workload metrics.</p>
            </div>
            <div className="surface-panel p-5 bg-card/50 transition-all duration-300 hover:border-primary/20 hover:shadow-sm reveal">
              <h3 className="text-sm font-bold">Clear Coordination</h3>
              <p className="mt-1 text-xs text-muted-foreground">Maintain open communication between parents, teachers, and coordinators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders Section — Refactored to Role Entry Selection */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-b border-border" id="role-selection">
        <div className="text-center mb-10 reveal">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto justify-center reveal-group">
          {activeCategory === "school" ? (
            <>
              {/* Principal */}
              <button
                onClick={() => handleRoleSelect("principal")}
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group reveal"
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
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group reveal"
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
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group reveal"
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
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group reveal"
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
                className="surface-panel p-6 flex flex-col text-left justify-between bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-elevated group reveal"
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
          <div className="space-y-4 reveal">
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
          

          <div className="space-y-4 reveal">
            {/* Visual preview of Socratic Tutor interaction */}
            <div className="surface-panel p-5 bg-card/60 border border-border shadow-sm transition-all duration-300 hover:shadow-elevated">
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-3">Tutor Interaction</p>
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
        <div className="text-center mb-10 reveal">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Connected System</span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Designed to bring school workflows together</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            See how information moves through SHWAI to connect administrators, teachers, students, and parents.
          </p>
        </div>

        {/* Visual Progress Steps */}
        <div className="grid gap-6 md:grid-cols-4 reveal-group">
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group reveal">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">01</div>
            <h4 className="text-sm font-bold">Operational Setup</h4>
            <p className="mt-1 text-xs text-muted-foreground">Administrators set up class cohorts, configure registers, and schedule timetables.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group reveal">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">02</div>
            <h4 className="text-sm font-bold">Classroom Instruction</h4>
            <p className="mt-1 text-xs text-muted-foreground">Teachers mark attendance, assign homework, and record test grades in the gradebook.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group reveal">
            <div className="text-lg font-bold text-primary font-mono mb-2 transition-transform duration-300 group-hover:scale-110">03</div>
            <h4 className="text-sm font-bold">Student Progress</h4>
            <p className="mt-1 text-xs text-muted-foreground">Students view timetables, submit homework, and receive learning hints.</p>
          </div>
          <div className="relative p-5 border border-border rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card group reveal">
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
            <div className="lg:col-span-5 reveal">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Academic Insights</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Visualizing student growth and needs</h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                SHWAI unifies operational records and academic milestones. It highlights key trends such as learning spikes, attendance indicators, and workload strain to let educators intervene early and effectively.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">1</div>
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground font-semibold">Unified Records:</strong> Track grades, attendance metrics, and homework completions across all classes in one connected view.</p>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">2</div>
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground font-semibold">Teacher Verification:</strong> Ensure human approval on high-stakes calls, keeping educators always in control of the software output.</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-7 reveal">
              {/* Illustrative Mockup Container */}
              <div className="surface-panel p-5 bg-card shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-elevated">
                <div className="flex items-center border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-destructive" />
                    <span className="size-2.5 rounded-full bg-warning" />
                    <span className="size-2.5 rounded-full bg-success" />
                  </div>
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
        <div className="text-center mb-12 reveal">
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
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative reveal">
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
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative reveal">
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
            <div className="grid gap-6 md:grid-cols-2 md:items-start relative reveal">
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
        <div className="text-center mb-10 reveal">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Major platform modules</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            A comprehensive set of tools mapped to core school requirements.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 reveal-group">
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75 reveal">
            <LayoutDashboard className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Role Dashboards</h4>
              <p className="mt-1 text-xs text-muted-foreground">Tailored interfaces showing schedule summaries and notifications.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75 reveal">
            <NotebookPen className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Academics & Homework</h4>
              <p className="mt-1 text-xs text-muted-foreground">Build assignments, check progress, and log gradebook marks.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75 reveal">
            <Calendar className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Timetables & Registers</h4>
              <p className="mt-1 text-xs text-muted-foreground">Daily attendance logs, cohort rosters, and timetable calendars.</p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card/30 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/75 reveal">
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
          <div className="text-center mb-10 reveal">
            <h2 className="text-2xl font-bold tracking-tight">Flexible plans for school growth</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review SHWAI's available pricing tiers and plan options.
            </p>
          </div>
          
          <div className="grid gap-4 lg:grid-cols-3 reveal-group">
            {PLANS.map((p) => (
              <article key={p.id} className="surface-panel flex flex-col p-6 justify-between bg-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-elevated reveal">
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
      <section className="mx-auto max-w-4xl px-5 py-16 text-center reveal">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to simplify your school's workflows?</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
          Explore the SHWAI platform to see how we bring administration, class grading, student learning, and parent updates together.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
            <a href="#role-selection">Explore the Platform</a>
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
