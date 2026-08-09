// SHWAI domain types. Every mock dataset and mock service is typed here so the
// mock layer can be swapped for real API calls without touching UI components.

export type Role = "student" | "teacher" | "parent" | "admin" | "principal" | "owner";

export type PlanId = "starter" | "professional" | "enterprise";

export type FeatureTier = PlanId;

export type Locale = "en" | "hi" | "mr" | "ta";

export interface School {
  id: string;
  name: string;
  code: string;
  board: "CBSE" | "ICSE" | "State Board";
  city: string;
  state: string;
  campuses: Campus[];
  students: number;
  teachers: number;
  plan: PlanId;
  logoInitials: string;
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  students: number;
  isPrimary: boolean;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed" | "planned";
}

export interface ClassSection {
  id: string;
  grade: number;
  section: string;
  label: string;
  classTeacherId: string;
  classTeacher: string;
  strength: number;
  room: string;
  avgAttendance: number;
  avgScore: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  grades: number[];
  colorToken: "primary" | "success" | "warning" | "danger" | "ai" | "info";
}

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  grade: number;
  section: string;
  classId: string;
  gender: "Male" | "Female";
  dob: string;
  guardianName: string;
  guardianPhone: string;
  parentId: string;
  attendancePct: number;
  avgScore: number;
  homeworkCompletion: number;
  riskLevel: RiskLevel;
  riskScore: number;
  house: "Aravalli" | "Nilgiri" | "Shivalik" | "Vindhya";
  transportRoute?: string;
  feeStatus: "paid" | "partial" | "overdue";
  xp: number;
  level: number;
  streak: number;
  languages: string[];
  status: "active" | "alumni" | "transferred";
  photoHue: number;
}

export interface Teacher {
  id: string;
  employeeId: string;
  name: string;
  subjects: string[];
  classes: string[];
  phone: string;
  email: string;
  experienceYears: number;
  weeklyPeriods: number;
  gradingBacklog: number;
  workloadIndex: number;
  wellbeing: "healthy" | "watch" | "strained";
  attendancePct: number;
  isClassTeacher: boolean;
  photoHue: number;
}

export interface Parent {
  id: string;
  name: string;
  relation: "Father" | "Mother" | "Guardian";
  phone: string;
  email: string;
  occupation: string;
  wardIds: string[];
  preferredLanguage: Locale;
  engagementScore: number;
  photoHue: number;
}

export interface StaffMember {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  joinedOn: string;
  leaveBalance: number;
  onLeave: boolean;
  photoHue: number;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  classId: string;
  classLabel: string;
  teacherId: string;
  teacher: string;
  assignedOn: string;
  dueDate: string;
  difficulty: "easy" | "medium" | "hard";
  mode: "online" | "offline" | "hybrid";
  submissionFormat: "text" | "file" | "quiz" | "worksheet";
  totalMarks: number;
  submitted: number;
  pending: number;
  late: number;
  aiGenerated: boolean;
  concepts: string[];
  status: "draft" | "published" | "closed";
  description: string;
  attachments: { name: string; size: string; type: string }[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedOn?: string;
  status: "submitted" | "late" | "missing" | "graded";
  marks?: number;
  feedback?: string;
  aiFeedbackDraft?: string;
  files: { name: string; size: string }[];
}

export interface GradeEntry {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  assessment: string;
  term: "Term 1" | "Term 2";
  marks: number;
  maxMarks: number;
  gradeLetter: string;
  published: boolean;
}

export interface Exam {
  id: string;
  name: string;
  type: "Unit Test" | "Half Yearly" | "Annual" | "Pre-Board" | "Practical";
  grades: number[];
  startDate: string;
  endDate: string;
  status: "scheduled" | "ongoing" | "evaluating" | "published";
  subjectsCount: number;
  papersReady: number;
  avgScore?: number;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "short" | "long" | "truefalse";
  prompt: string;
  options?: string[];
  answer: string;
  marks: number;
  concept: string;
  difficulty: "easy" | "medium" | "hard";
  aiGenerated: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  grade: number;
  durationMins: number;
  questions: QuizQuestion[];
  status: "draft" | "scheduled" | "live" | "completed";
  scheduledFor: string;
  avgScore?: number;
  attempts: number;
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  classId: string;
  status: AttendanceStatus;
  markedBy: string;
  synced: boolean;
}

export interface TimetableSlot {
  id: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  teacherId: string;
  classId: string;
  room: string;
  isSubstitute?: boolean;
  conflict?: string;
}

export interface FeeRecord {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  term: string;
  headings: { head: string; amount: number }[];
  total: number;
  paid: number;
  dueDate: string;
  status: "paid" | "partial" | "overdue";
  method?: "UPI" | "Net Banking" | "Cash" | "Cheque" | "Card";
  concession?: number;
  scholarship?: string;
}

export interface AdmissionEnquiry {
  id: string;
  applicantName: string;
  gradeApplied: number;
  parentName: string;
  phone: string;
  source: "Walk-in" | "Website" | "Referral" | "Advertisement";
  stage:
    | "enquiry"
    | "application"
    | "documents"
    | "entrance-test"
    | "interview"
    | "offer"
    | "enrolled"
    | "dropped";
  createdOn: string;
  followUpOn: string;
  documentsVerified: number;
  documentsTotal: number;
  entranceScore?: number;
  aiFitScore: number;
  owner: string;
}

export interface TransportRoute {
  id: string;
  name: string;
  busNo: string;
  driver: string;
  driverPhone: string;
  attendant: string;
  stops: { name: string; time: string; students: number }[];
  studentsCount: number;
  status: "on-route" | "at-school" | "idle" | "delayed";
  delayMins?: number;
  gps: { lat: number; lng: number; speedKmph: number; updatedAt: string };
}

export interface LibraryItem {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  copies: number;
  available: number;
  issuedTo?: string;
  dueDate?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: "academic" | "attendance" | "fees" | "transport" | "ai" | "system" | "intervention";
  createdAt: string;
  read: boolean;
  severity: "info" | "success" | "warning" | "critical";
  roles: Role[];
  actionLabel?: string;
  actionHref?: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  channel: "in-app" | "sms" | "whatsapp" | "email";
  language: Locale;
  unread: number;
  lastMessageAt: string;
  messages: { id: string; author: string; body: string; at: string; mine: boolean }[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string[];
  channels: ("in-app" | "sms" | "whatsapp" | "email")[];
  publishedAt: string;
  author: string;
  emergency: boolean;
  languages: Locale[];
}

export interface Concept {
  id: string;
  name: string;
  subject: string;
  grade: number;
  unit: string;
  prerequisites: string[];
  masteryPct: number;
  studentsStruggling: number;
  misconceptions: Misconception[];
  taughtOn?: string;
  plannedOn: string;
  retestScheduled?: boolean;
}

export interface Misconception {
  id: string;
  conceptId: string;
  statement: string;
  correction: string;
  studentsAffected: number;
  classesAffected: string[];
  detectedFrom: string;
  confidence: number;
}

export interface LearningDebtItem {
  id: string;
  conceptId: string;
  concept: string;
  subject: string;
  grade: number;
  classLabel: string;
  debtType:
    | "not-taught-on-schedule"
    | "taught-not-understood"
    | "missing-prerequisite"
    | "repeated-misconception"
    | "memorised-not-mastered"
    | "over-covered"
    | "under-covered";
  severity: 1 | 2 | 3 | 4 | 5;
  studentsAffected: number;
  recommendation: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  problem: string;
  type: "attendance" | "academic" | "behaviour" | "wellbeing" | "homework";
  recommended: string;
  ownerRole: "Teacher" | "Counsellor" | "Administrator";
  owner: string;
  assignedOn: string;
  followUpOn: string;
  status: "open" | "in-progress" | "completed" | "escalated";
  baseline: string;
  outcome?: string;
  improvementPct?: number;
  parentAcknowledged: boolean;
  history: { at: string; note: string; by: string }[];
}

export interface InterventionExperiment {
  id: string;
  title: string;
  problem: string;
  intervention: string;
  studentsInvolved: number;
  classesInvolved: string[];
  expectedImprovement: string;
  baselineValue: number;
  postValue?: number;
  metric: string;
  reviewDate: string;
  owner: string;
  status: "planned" | "running" | "review-due" | "completed";
  successRate?: number;
  verdict?: "worked" | "partial" | "no-effect";
}

export interface RiskAlert {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  riskType:
    | "attendance"
    | "homework"
    | "performance-decline"
    | "missed-assignments"
    | "engagement"
    | "dropout";
  riskScore: number;
  confidence: number;
  uncertainty: string;
  evidence: { label: string; value: string }[];
  recommendation: string;
  detectedOn: string;
  status: "new" | "acknowledged" | "intervention-assigned" | "resolved";
}

export interface WorkloadSignal {
  id: string;
  teacherId: string;
  teacher: string;
  gradingHours: number;
  adminHours: number;
  teachingHours: number;
  remedialDuties: number;
  extracurricularDuties: number;
  studentQuestions: number;
  behaviourCases: number;
  duplicateEntries: number;
  repetitiveReports: number;
  predictedNextWeek: number;
  wellbeing: "healthy" | "watch" | "strained";
}

export interface WorkloadRecommendation {
  id: string;
  title: string;
  detail: string;
  impact: string;
  teachersAffected: string[];
  category:
    "reschedule" | "shared-rubric" | "resources" | "support-staff" | "remove-report" | "balance";
  savingHours: number;
}

export interface StudentContextEntry {
  id: string;
  studentId: string;
  studentName: string;
  category:
    | "school-transfer"
    | "language-support"
    | "health-accommodation"
    | "family-circumstance"
    | "transport"
    | "caregiving";
  summary: string;
  consentBy: string;
  consentOn: string;
  expiresOn: string;
  visibleTo: string[];
  source: "Parent" | "Staff" | "Counsellor";
  supportPlan?: string;
  accessLog: { by: string; role: string; at: string; reason: string }[];
}

export interface HelpMatch {
  id: string;
  studentId: string;
  studentName: string;
  topic: string;
  subject: string;
  matchType:
    "peer-tutor" | "office-hour" | "remedial-group" | "library" | "external" | "counsellor";
  matchName: string;
  language: string;
  slot: string;
  masteryOfHelper?: number;
  helperWorkload?: "light" | "moderate" | "heavy";
  status: "suggested" | "accepted" | "completed";
  credits?: number;
}

export interface AiRecommendation {
  id: string;
  title: string;
  body: string;
  audience: Role[];
  category: "teaching" | "learning" | "operations" | "wellbeing" | "curriculum";
  confidence: number;
  provenanceId: string;
  impact: "high" | "medium" | "low";
  approved: boolean;
}

export interface AiProvenance {
  id: string;
  outputTitle: string;
  outputType: "worksheet" | "quiz" | "report" | "recommendation" | "message" | "lesson-plan";
  sources: { label: string; detail: string }[];
  learningObjective?: string;
  difficulty?: "easy" | "medium" | "hard";
  answerKeyAvailable: boolean;
  reasoning: string;
  confidence: number;
  uncertainty: string;
  missingData: string[];
  biasWarnings: string[];
  approvedBy?: string;
  approvedOn?: string;
  versions: { version: string; at: string; by: string; note: string }[];
  model: string;
  promptVersion: string;
}

export interface Prediction {
  id: string;
  subject: string;
  metric: string;
  scope: string;
  value: number;
  unit: string;
  ciLow: number;
  ciHigh: number;
  confidence: number;
  horizon: string;
  requiresHumanReview: boolean;
  trend: { label: string; actual?: number; predicted?: number }[];
}

export interface Scenario {
  id: string;
  name: string;
  question: string;
  category:
    "timetable" | "staffing" | "attendance" | "rooms" | "remedial" | "intervention" | "resources";
  createdBy: string;
  createdOn: string;
  assumptions: string[];
  risks: string[];
  outcomes: {
    metric: string;
    baseline: number;
    projected: number;
    unit: string;
    ciLow: number;
    ciHigh: number;
  }[];
  confidence: number;
  status: "draft" | "simulated" | "adopted" | "rejected";
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: "academic" | "attendance" | "teacher" | "student" | "school" | "operations" | "ai";
  description: string;
  lastRun: string;
  schedule: "manual" | "weekly" | "monthly" | "termly";
  formats: ("PDF" | "Excel" | "CSV" | "Print")[];
  requiredPlan: PlanId;
}

export interface SchoolDocument {
  id: string;
  name: string;
  category:
    | "Notes"
    | "Syllabus"
    | "Circular"
    | "Worksheet"
    | "Form"
    | "Policy"
    | "Report Card"
    | "Certificate"
    | "Staff"
    | "Curriculum";
  sizeKb: number;
  fileType: "PDF" | "DOCX" | "XLSX" | "PPTX";
  owner: string;
  uploadedOn: string;
  visibleTo: Role[];
  tags: string[];
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  role: Role;
  action: "view" | "edit" | "export" | "delete" | "ai-decision" | "login" | "permission-change";
  entity: string;
  detail: string;
  ip: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type:
    "holiday" | "exam" | "ptm" | "event" | "sports" | "function" | "assignment-due" | "exam-due";
  audience: string[];
  location?: string;
}

export interface GamificationProfile {
  studentId: string;
  studentName: string;
  xp: number;
  level: number;
  streak: number;
  badges: { id: string; name: string; description: string; earnedOn: string; icon: string }[];
  house: string;
  weeklyChallenge: { title: string; progress: number; target: number };
  rank: number;
}

export interface AiChatMessage {
  id: string;
  role: "student" | "assistant";
  body: string;
  at: string;
  hintLevel?: number;
  provenanceId?: string;
}

export interface Integration {
  id: string;
  name: string;
  category: "academic" | "files" | "meetings" | "communication";
  description: string;
  status: "connected" | "available" | "coming-soon";
  connectedOn?: string;
  requiredPlan: PlanId;
}

export interface FutureProduct {
  id: string;
  name: string;
  description: string;
  category: "learning" | "guidance";
  stage: "preview" | "in-design" | "planned";
  eta: string;
}

// ── Real, DB-backed SHWAI workflows (notices, homework, submissions, chat) ──
// These mirror the Supabase rows (see src/server/*) and intentionally stay
// separate from the mock Assignment/Submission types above, which power the
// unrelated gradebook/exam mock UI.

export type NoticeAudienceType =
  | "all_students"
  | "class"
  | "all_teachers"
  | "specific_teachers"
  | "specific_students"
  | "parents"
  | "school";

export interface FileMeta {
  id: string;
  filePath: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

export interface Notice {
  id: string;
  schoolId: string;
  authorId: string;
  authorName: string;
  authorRole: "teacher" | "principal";
  title: string;
  body: string;
  audienceType: NoticeAudienceType;
  audienceClassIds: string[];
  audienceTeacherIds: string[];
  audienceStudentIds: string[];
  createdAt: string;
  updatedAt: string;
  attachments: FileMeta[];
  /** Populated only in viewer-scoped lists (student/teacher own status). */
  viewerHasViewed?: boolean;
  /** Populated only in author-scoped "my notices" lists. */
  recipientCount?: number;
  viewedCount?: number;
}

export interface NoticeActivityRow {
  viewerId: string;
  viewerName: string;
  viewed: boolean;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
}

export interface NoticeActivity {
  recipientCount: number;
  viewedCount: number;
  rows: NoticeActivityRow[];
}

export type HomeworkStatus = "draft" | "published" | "closed";
export type SubmissionStatus = "submitted" | "late" | "graded";

export interface HomeworkItem {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  classId: string;
  classLabel: string;
  title: string;
  description: string;
  dueAt: string;
  totalMarks: number | null;
  allowResubmission: boolean;
  status: HomeworkStatus;
  createdAt: string;
  attachments: FileMeta[];
  /** Populated only for the student viewer. */
  viewerHasViewed?: boolean;
  viewerSubmission?: SubmissionRecord | null;
  /** Populated only for the teacher/principal viewer (activity rollup). */
  assignedCount?: number;
  viewedCount?: number;
  submittedCount?: number;
  lateCount?: number;
}

export interface HomeworkActivityRow {
  studentId: string;
  studentName: string;
  viewed: boolean;
  firstViewedAt: string | null;
  submitted: boolean;
  submissionStatus: SubmissionStatus | null;
  submittedAt: string | null;
}

export interface HomeworkActivity {
  assignedCount: number;
  viewedCount: number;
  notViewedCount: number;
  submittedCount: number;
  notSubmittedCount: number;
  lateCount: number;
  rows: HomeworkActivityRow[];
}

export interface SubmissionRecord {
  id: string;
  homeworkId: string;
  homeworkTitle?: string;
  studentId: string;
  studentName: string;
  comment: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  marks: number | null;
  feedback: string | null;
  reviewedAt: string | null;
  files: FileMeta[];
}

export interface Conversation {
  id: string;
  schoolId: string;
  teacherId: string;
  studentId: string;
  otherId: string;
  otherName: string;
  lastMessageBody?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: "teacher" | "student";
  senderId: string;
  body: string;
  createdAt: string;
  readByTeacherAt: string | null;
  readByStudentAt: string | null;
  attachment?: FileMeta;
}
