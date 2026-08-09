import type { PlanId, Role } from "@/types";

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
  plan?: PlanId;
  badge?: "AI" | "Preview" | "New" | "Beta";
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL: Role[] = ["student", "teacher", "parent", "admin", "principal", "owner"];
const STAFFISH: Role[] = ["teacher", "admin", "principal", "owner"];
const LEADERSHIP: Role[] = ["admin", "principal", "owner"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        path: "/app",
        icon: "LayoutDashboard",
        roles: ALL,
        description: "Role dashboard with summaries, alerts and AI insights",
      },
      {
        label: "Calendar",
        path: "/app/calendar",
        icon: "CalendarDays",
        roles: ALL,
        description: "School calendar, holidays, exams, PTMs and deadlines",
      },
      {
        label: "Notifications",
        path: "/app/notifications",
        icon: "Bell",
        roles: ALL,
        description: "Notification centre with read/unread state",
      },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        label: "Homework",
        path: "/app/homework",
        icon: "NotebookPen",
        roles: ALL,
        description: "Assignments, submissions, AI generation and tracking",
      },
      {
        label: "Gradebook",
        path: "/app/gradebook",
        icon: "ClipboardCheck",
        roles: STAFFISH,
        description: "Marks entry, rubric grading, AI feedback, report cards",
      },
      {
        label: "Exams",
        path: "/app/exams",
        icon: "FileSpreadsheet",
        roles: ALL,
        description: "Exam schedules, papers, evaluation and results",
      },
      {
        label: "Quizzes",
        path: "/app/quizzes",
        icon: "ListChecks",
        roles: ALL,
        description: "Quiz builder, question bank and AI quiz generation",
      },
      {
        label: "Timetable",
        path: "/app/timetable",
        icon: "CalendarRange",
        roles: ALL,
        description: "Timetable grid, conflicts and substitutions",
      },
      {
        label: "Reports",
        path: "/app/reports",
        icon: "FileBarChart",
        roles: STAFFISH,
        description: "Academic, attendance, teacher and school reports",
      },
    ],
  },
  {
    label: "Attendance",
    items: [
      {
        label: "Attendance",
        path: "/app/attendance",
        icon: "UserCheck",
        roles: ALL,
        description: "Daily marking, trends and analytics",
      },
      {
        label: "Leave",
        path: "/app/leave",
        icon: "CalendarX",
        roles: STAFFISH,
        description: "Student and staff leave management",
      },
      {
        label: "Offline & Kiosk",
        path: "/app/offline",
        icon: "WifiOff",
        roles: STAFFISH,
        plan: "enterprise",
        description: "Offline attendance, marks entry and sync simulation",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Students",
        path: "/app/students",
        icon: "GraduationCap",
        roles: LEADERSHIP.concat("teacher"),
        description: "Student information system, profiles, promotion, alumni",
      },
      {
        label: "Teachers",
        path: "/app/teachers",
        icon: "Presentation",
        roles: LEADERSHIP,
        description: "Teacher profiles, workload and support",
      },
      {
        label: "Parents",
        path: "/app/parents",
        icon: "Users",
        roles: LEADERSHIP,
        description: "Parent directory, contacts and engagement",
      },
      {
        label: "Staff",
        path: "/app/staff",
        icon: "Briefcase",
        roles: LEADERSHIP,
        description: "Staff records, leave, payroll integration, duties",
      },
      {
        label: "Admissions",
        path: "/app/admissions",
        icon: "UserPlus",
        roles: LEADERSHIP,
        plan: "enterprise",
        badge: "AI",
        description: "Enquiries, applications, documents, entrance tests",
      },
    ],
  },
  {
    label: "Portals",
    items: [
      {
        label: "Student portal",
        path: "/app/portal/student",
        icon: "BookOpen",
        roles: ALL,
        description: "Student-facing learning portal",
      },
      {
        label: "Teacher portal",
        path: "/app/portal/teacher",
        icon: "SquarePen",
        roles: STAFFISH,
        description: "Teacher-facing classroom portal",
      },
      {
        label: "Parent portal",
        path: "/app/portal/parent",
        icon: "HeartHandshake",
        roles: ["parent", "admin", "principal"],
        description: "Parent-facing progress portal",
      },
      {
        label: "Staff portal",
        path: "/app/portal/staff",
        icon: "IdCard",
        roles: LEADERSHIP,
        description: "Staff duties, leave and operational workflows",
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        label: "AI tutor",
        path: "/app/ai/tutor",
        icon: "Sparkles",
        roles: ["student", "teacher", "admin", "principal"],
        plan: "professional",
        badge: "AI",
        description: "Socratic tutor with five progressive hints",
      },
      {
        label: "AI content studio",
        path: "/app/ai/studio",
        icon: "Wand2",
        roles: STAFFISH,
        plan: "professional",
        badge: "AI",
        description: "Slides, worksheets, flashcards, mind maps, question banks",
      },
      {
        label: "Teacher assistant",
        path: "/app/ai/teacher-assistant",
        icon: "Bot",
        roles: STAFFISH,
        plan: "professional",
        badge: "AI",
        description: "Lesson planning, drafts and teaching recommendations",
      },
      {
        label: "AI provenance",
        path: "/app/ai/provenance",
        icon: "ShieldCheck",
        roles: LEADERSHIP.concat("teacher"),
        plan: "enterprise",
        description: "Evidence, confidence, approvals and version history",
      },
      {
        label: "AI governance",
        path: "/app/ai/governance",
        icon: "Scale",
        roles: LEADERSHIP,
        plan: "enterprise",
        description: "Model audit records, approved sources, AI settings",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Early warning",
        path: "/app/intelligence/early-warning",
        icon: "TriangleAlert",
        roles: STAFFISH,
        plan: "professional",
        description: "At-risk identification with explainable evidence",
      },
      {
        label: "Concept intelligence",
        path: "/app/intelligence/concepts",
        icon: "Network",
        roles: STAFFISH,
        plan: "professional",
        description: "Concept mastery, prerequisites and misconceptions",
      },
      {
        label: "School intelligence",
        path: "/app/intelligence/school",
        icon: "ChartSpline",
        roles: LEADERSHIP,
        plan: "professional",
        description: "School-wide trends, forecasting and utilisation",
      },
      {
        label: "Leadership assistant",
        path: "/app/intelligence/assistant",
        icon: "MessagesSquare",
        roles: LEADERSHIP,
        plan: "professional",
        badge: "AI",
        description: "Natural-language questions about school data",
      },
      {
        label: "Predictions",
        path: "/app/intelligence/predictions",
        icon: "TrendingUp",
        roles: LEADERSHIP,
        plan: "enterprise",
        description: "Predictive intelligence with confidence intervals",
      },
    ],
  },
  {
    label: "Student support",
    items: [
      {
        label: "Interventions",
        path: "/app/interventions",
        icon: "LifeBuoy",
        roles: STAFFISH,
        plan: "professional",
        description: "Cases, owners, follow-ups, escalation and outcomes",
      },
      {
        label: "Experiments",
        path: "/app/interventions/experiments",
        icon: "FlaskConical",
        roles: STAFFISH,
        plan: "enterprise",
        description: "Intervention experiment tracker and evidence library",
      },
      {
        label: "Help network",
        path: "/app/help-network",
        icon: "Handshake",
        roles: ALL,
        plan: "enterprise",
        description: "Peer tutors, office hours, remedial groups, resources",
      },
      {
        label: "Context passport",
        path: "/app/context-passport",
        icon: "FileLock2",
        roles: LEADERSHIP.concat("teacher"),
        plan: "enterprise",
        description: "Consent-based student context with access logs",
      },
    ],
  },
  {
    label: "Curriculum health",
    items: [
      {
        label: "Learning-debt map",
        path: "/app/learning-debt",
        icon: "LayoutGrid",
        roles: STAFFISH,
        plan: "enterprise",
        description: "Where the curriculum is silently falling behind",
      },
      {
        label: "Teacher workload",
        path: "/app/workload",
        icon: "Gauge",
        roles: STAFFISH,
        plan: "enterprise",
        description: "Workload analysis, prediction and rebalancing",
      },
      {
        label: "What-if simulator",
        path: "/app/simulator",
        icon: "SlidersHorizontal",
        roles: LEADERSHIP,
        plan: "enterprise",
        description: "Digital twin scenario planning with trade-offs",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Fees",
        path: "/app/fees",
        icon: "IndianRupee",
        roles: ["admin", "principal", "owner", "parent"],
        plan: "enterprise",
        description: "Installments, scholarships, receipts and reconciliation",
      },
      {
        label: "Transport",
        path: "/app/transport",
        icon: "Bus",
        roles: ["admin", "principal", "owner", "parent"],
        plan: "enterprise",
        description: "Routes, GPS tracking, pickup/drop confirmation",
      },
      {
        label: "Library",
        path: "/app/library",
        icon: "Library",
        roles: ALL,
        description: "Catalogue, issues and returns",
      },
      {
        label: "Inventory & facilities",
        path: "/app/facilities",
        icon: "Package",
        roles: LEADERSHIP,
        description: "Inventory, classrooms and certificates",
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        label: "Communication",
        path: "/app/communication",
        icon: "Send",
        roles: ALL,
        description: "Messaging, SMS, WhatsApp-compatible and email",
      },
      {
        label: "Announcements",
        path: "/app/announcements",
        icon: "Megaphone",
        roles: ALL,
        description: "School and class announcements, emergency alerts",
      },
      {
        label: "Live classes",
        path: "/app/live-classes",
        icon: "Video",
        roles: ALL,
        description: "Live classes, recordings, whiteboard and polls",
      },
      {
        label: "Gamification",
        path: "/app/gamification",
        icon: "Trophy",
        roles: ["student", "teacher", "parent", "admin"],
        description: "XP, levels, streaks, badges and leaderboards",
      },
    ],
  },
  {
    label: "Knowledge",
    items: [
      {
        label: "Documents",
        path: "/app/documents",
        icon: "Folder",
        roles: ALL,
        description: "Notes, circulars, policies, report cards, certificates",
      },
      {
        label: "Knowledge base",
        path: "/app/knowledge-base",
        icon: "Search",
        roles: STAFFISH,
        plan: "enterprise",
        badge: "AI",
        description: "Natural-language search across school documents",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        label: "Audit logs",
        path: "/app/audit",
        icon: "ScrollText",
        roles: LEADERSHIP,
        plan: "professional",
        description: "Data access, edit, export and AI-decision logs",
      },
      {
        label: "Security",
        path: "/app/security",
        icon: "Lock",
        roles: LEADERSHIP,
        description: "Authentication, encryption, backups, tenant isolation",
      },
      {
        label: "Privacy & data",
        path: "/app/privacy",
        icon: "FileKey",
        roles: LEADERSHIP,
        plan: "enterprise",
        description: "Retention, deletion, consent and data requests",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "Integrations",
        path: "/app/integrations",
        icon: "Plug",
        roles: LEADERSHIP,
        description: "Classroom, Drive, Teams, Zoom, SMS and WhatsApp",
      },
      {
        label: "Settings",
        path: "/app/settings",
        icon: "Settings",
        roles: ALL,
        description: "School, user, AI, data and privacy settings",
      },
      {
        label: "Subscription",
        path: "/app/subscription",
        icon: "BadgeCheck",
        roles: ["owner"],
        description: "Subscription information for the school owner",
      },
      {
        label: "Billing",
        path: "/app/billing",
        icon: "Receipt",
        roles: ["admin", "owner"],
        description: "Invoices, billing history and payment records",
      },
      {
        label: "AI learning products",
        path: "/app/future",
        icon: "Rocket",
        roles: ALL,
        description: "AI learning and student-guidance products",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export function findNavItem(path: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => i.path === path);
}

/** Mobile bottom-bar destinations per role. */
export const MOBILE_NAV: Record<Role, string[]> = {
  student: ["/app", "/app/homework", "/app/ai/tutor", "/app/timetable", "/app/notifications"],
  teacher: [
    "/app",
    "/app/attendance",
    "/app/gradebook",
    "/app/ai/teacher-assistant",
    "/app/notifications",
  ],
  parent: ["/app", "/app/portal/parent", "/app/fees", "/app/communication", "/app/notifications"],
  admin: ["/app", "/app/students", "/app/attendance", "/app/fees", "/app/notifications"],
  principal: [
    "/app",
    "/app/intelligence/school",
    "/app/interventions",
    "/app/teachers",
    "/app/notifications",
  ],
  owner: [
    "/app",
    "/app/intelligence/school",
    "/app/subscription",
    "/app/reports",
    "/app/notifications",
  ],
};
