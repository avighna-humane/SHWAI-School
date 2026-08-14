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

const ALL: Role[] = ["student", "teacher", "parent", "staff", "admin", "principal", "owner"];
const STAFFISH: Role[] = ["teacher", "staff", "admin", "principal", "owner"];
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
      {
        label: "Notices",
        path: "/app/notices",
        icon: "Megaphone",
        roles: ALL,
        badge: "New",
        description: "School notices, alerts and announcements for all roles",
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
        label: "Submissions",
        path: "/app/submissions",
        icon: "FileCheck",
        roles: STAFFISH,
        badge: "New",
        description: "Review, grade and give feedback on student homework submissions",
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
        label: "Substitutes",
        path: "/app/substitutes",
        icon: "UserRoundCog",
        roles: STAFFISH,
        description: "Persisted substitute-teacher assignments and availability",
      },
      {
        label: "Reports",
        path: "/app/reports",
        icon: "FileBarChart",
        roles: STAFFISH,
        description: "Observed academic, attendance and school reports",
      },
      {
        label: "Report cards",
        path: "/app/report-cards",
        icon: "FileBarChart2",
        roles: ALL,
        description: "Published academic report cards and subject results",
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
        roles: ["student"],
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
        label: "AI content library",
        path: "/app/ai/content-library",
        icon: "LibraryBig",
        roles: ["student", "parent", "teacher", "staff", "principal", "admin", "owner"],
        plan: "professional",
        badge: "AI",
        description: "Teacher-approved resources and tenant-scoped AI drafts",
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
        description: "School-wide observed trends, alert volume and intervention status",
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
    ],
  },
  {
    label: "Enterprise operations",
    items: [
      {
        label: "Operations workspace",
        path: "/app/operations",
        icon: "Building2",
        roles: STAFFISH,
        plan: "professional",
        description: "Admissions, fees, transport, library, inventory and facilities",
      },
    ],
  },
  {
    label: "Decision intelligence",
    items: [
      {
        label: "Decision workspace",
        path: "/app/decisions",
        icon: "GitCompare",
        roles: LEADERSHIP,
        plan: "professional",
        description: "Transparent what-if scenarios, learning debt and workload evidence",
      },
    ],
  },
  {
    label: "Support infrastructure",
    items: [
      {
        label: "Student support",
        path: "/app/support",
        icon: "HandHelping",
        roles: ALL,
        plan: "professional",
        description: "Privacy-first context and safe help requests",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Library",
        path: "/app/library",
        icon: "Library",
        roles: ALL,
        description: "Catalogue, issues and returns",
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        label: "Chat",
        path: "/app/chat",
        icon: "MessageCircle",
        roles: ["student", "teacher", "principal", "admin"] as Role[],
        badge: "New",
        description: "Direct messaging between teachers and students",
      },
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
        description: "Mock invoices, billing history and payment records",
      },
      {
        label: "Future products",
        path: "/app/future",
        icon: "Rocket",
        roles: ALL,
        badge: "Preview",
        description: "Upcoming AI learning and student-guidance products",
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
  student: ["/app", "/app/homework", "/app/notices", "/app/chat", "/app/notifications"],
  teacher: ["/app", "/app/homework", "/app/submissions", "/app/chat", "/app/notifications"],
  parent: ["/app", "/app/portal/parent", "/app/communication", "/app/notifications"],
  staff: ["/app", "/app/attendance", "/app/notices", "/app/documents", "/app/notifications"],
  admin: [
    "/app",
    "/app/students",
    "/app/attendance",
    "/app/intelligence/school",
    "/app/notifications",
  ],
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
