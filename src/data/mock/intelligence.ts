import type {
  Concept,
  LearningDebtItem,
  Misconception,
  Prediction,
  RiskAlert,
  Scenario,
  WorkloadRecommendation,
  WorkloadSignal,
} from "@/types";
import { STUDENTS, TEACHERS } from "./people";

function rnd(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
function num(seed: number, min: number, max: number) {
  return Math.round(min + rnd(seed) * (max - min));
}

const CONCEPT_SEEDS: [string, string, number, string, string[]][] = [
  ["Factorisation of quadratics", "Mathematics", 9, "Algebra", ["Algebraic identities", "Linear equations"]],
  ["Nature of roots (discriminant)", "Mathematics", 9, "Algebra", ["Factorisation of quadratics"]],
  ["Trigonometric ratios", "Mathematics", 10, "Trigonometry", ["Similar triangles", "Pythagoras theorem"]],
  ["Mean of grouped data", "Mathematics", 10, "Statistics", ["Frequency distribution"]],
  ["Balancing chemical equations", "Science", 9, "Chemical Reactions", ["Symbols and formulae", "Law of conservation of mass"]],
  ["Mirror formula & magnification", "Science", 10, "Light", ["Reflection", "Ray diagrams"]],
  ["Ohm's law", "Science", 10, "Electricity", ["Current and potential difference"]],
  ["Photosynthesis pathway", "Science", 9, "Life Processes", ["Cell structure"]],
  ["Formal letter format", "English", 9, "Writing Skills", ["Paragraph structure"]],
  ["Tenses — perfect continuous", "English", 9, "Grammar", ["Simple tenses"]],
  ["समास एवं संधि", "Hindi", 9, "व्याकरण", ["शब्द भेद"]],
  ["Non-cooperation movement", "Social Science", 10, "Nationalism in India", ["Colonial economy"]],
  ["Federalism", "Social Science", 10, "Political Science", ["Constitution basics"]],
  ["Nested loops", "Computer Science", 9, "Programming", ["Loops", "Conditionals"]],
  ["Functions & return values", "Computer Science", 9, "Programming", ["Nested loops"]],
];

export const CONCEPTS: Concept[] = CONCEPT_SEEDS.map(([name, subject, grade, unit, prerequisites], i) => {
  const n = i + 1;
  const masteryPct = num(n * 2.6, 28, 94);
  return {
    id: `cnp-${n}`,
    name,
    subject,
    grade,
    unit,
    prerequisites,
    masteryPct,
    studentsStruggling: num(n * 3.6, 2, 26),
    taughtOn: rnd(n * 4.6) > 0.25 ? `${num(n * 5.6, 1, 28)}/10/2025` : undefined,
    plannedOn: `${num(n * 6.6, 1, 28)}/10/2025`,
    retestScheduled: masteryPct < 55,
    misconceptions: [],
  };
});

export const MISCONCEPTIONS: Misconception[] = [
  { id: "mis-1", conceptId: "cnp-1", statement: "Students treat (a+b)² as a² + b², dropping the middle term.", correction: "Reinforce the expansion a² + 2ab + b² with an area-model demonstration.", studentsAffected: 19, classesAffected: ["Grade 9 — A", "Grade 9 — B"], detectedFrom: "Unit Test 2 · Q4, Q7 error clustering", confidence: 0.91 },
  { id: "mis-2", conceptId: "cnp-5", statement: "Coefficients are changed inside the formula instead of in front of it while balancing.", correction: "Practise with molecular models before symbolic balancing.", studentsAffected: 14, classesAffected: ["Grade 9 — A", "Grade 9 — C"], detectedFrom: "Worksheet submissions · 11 of 15 items", confidence: 0.84 },
  { id: "mis-3", conceptId: "cnp-6", statement: "Sign convention ignored — distances behind the mirror taken as positive.", correction: "Drill the Cartesian sign convention with three worked ray diagrams.", studentsAffected: 22, classesAffected: ["Grade 10 — A", "Grade 10 — B"], detectedFrom: "Numericals 3–7 error pattern", confidence: 0.88 },
  { id: "mis-4", conceptId: "cnp-3", statement: "sin θ and cos θ swapped when the triangle is rotated.", correction: "Anchor ratios to the angle, not to the page orientation.", studentsAffected: 17, classesAffected: ["Grade 10 — A"], detectedFrom: "Class test item analysis", confidence: 0.79 },
  { id: "mis-5", conceptId: "cnp-14", statement: "Inner loop counter reset omitted, producing partial output tables.", correction: "Trace-table exercise before writing code.", studentsAffected: 9, classesAffected: ["Grade 9 — A"], detectedFrom: "Lab submissions · 8 programs", confidence: 0.86 },
];

CONCEPTS.forEach((c) => {
  c.misconceptions = MISCONCEPTIONS.filter((m) => m.conceptId === c.id);
});

const DEBT_TYPES: LearningDebtItem["debtType"][] = [
  "not-taught-on-schedule",
  "taught-not-understood",
  "missing-prerequisite",
  "repeated-misconception",
  "memorised-not-mastered",
  "over-covered",
  "under-covered",
];

export const LEARNING_DEBT: LearningDebtItem[] = CONCEPTS.flatMap((c, i) =>
  ["A", "B"].map((sec, j) => {
    const n = (i + 1) * (j + 2);
    const severity = (num(n * 2.9, 1, 5) as LearningDebtItem["severity"]);
    return {
      id: `dbt-${c.id}-${sec}`,
      conceptId: c.id,
      concept: c.name,
      subject: c.subject,
      grade: c.grade,
      classLabel: `Grade ${c.grade} — ${sec}`,
      debtType: DEBT_TYPES[n % DEBT_TYPES.length],
      severity,
      studentsAffected: num(n * 3.9, 3, 28),
      recommendation:
        severity >= 4
          ? "Insert a 2-period prerequisite revision block before the next unit and re-test."
          : "Add a 15-minute recap and one diagnostic exit ticket in the next lesson.",
    };
  }),
);

export const RISK_ALERTS: RiskAlert[] = STUDENTS.filter((s) => s.riskLevel === "critical" || s.riskLevel === "high")
  .slice(0, 22)
  .map((s, i) => {
    const n = i + 1;
    const types: RiskAlert["riskType"][] = ["attendance", "homework", "performance-decline", "missed-assignments", "engagement", "dropout"];
    const riskType = types[n % types.length];
    return {
      id: `alr-${n}`,
      studentId: s.id,
      studentName: s.name,
      classLabel: `Grade ${s.grade} — ${s.section}`,
      riskType,
      riskScore: s.riskScore,
      confidence: Number((0.68 + rnd(n) * 0.28).toFixed(2)),
      uncertainty:
        "Attendance data for two weeks in October was entered offline and synced late, so the trend line is smoothed.",
      evidence: [
        { label: "Attendance (last 30 days)", value: `${s.attendancePct}% (school avg 93%)` },
        { label: "Homework completion", value: `${s.homeworkCompletion}% (down from ${Math.min(100, s.homeworkCompletion + 18)}%)` },
        { label: "Score movement", value: `${s.avgScore}% in UT2 vs ${Math.min(99, s.avgScore + 11)}% in UT1` },
        { label: "Missed submissions", value: `${num(n * 4.2, 1, 7)} in the last 3 weeks` },
        { label: "AI tutor sessions", value: `${num(n * 5.2, 0, 14)} sessions, ${num(n * 6.2, 1, 5)} unresolved concepts` },
      ],
      recommendation:
        riskType === "attendance"
          ? "Call the guardian this week and start a 4-week attendance contract with weekly review."
          : riskType === "dropout"
            ? "Escalate to counsellor. Combine fee-concession review with a home visit."
            : "Assign a small-group remedial block on the two weakest concepts and re-test in 10 days.",
      detectedOn: `${num(n * 7.2, 14, 21)}/11/2025`,
      status: (["new", "acknowledged", "intervention-assigned", "resolved"] as const)[n % 4],
    };
  });

export const WORKLOAD_SIGNALS: WorkloadSignal[] = TEACHERS.map((t, i) => {
  const n = i + 1;
  return {
    id: `wl-${n}`,
    teacherId: t.id,
    teacher: t.name,
    gradingHours: num(n * 2.5, 3, 16),
    adminHours: num(n * 3.5, 1, 9),
    teachingHours: num(n * 4.5, 16, 30),
    remedialDuties: num(n * 5.5, 0, 5),
    extracurricularDuties: num(n * 6.5, 0, 4),
    studentQuestions: num(n * 7.5, 12, 140),
    behaviourCases: num(n * 8.5, 0, 6),
    duplicateEntries: num(n * 9.5, 0, 22),
    repetitiveReports: num(n * 10.5, 0, 7),
    predictedNextWeek: num(n * 11.5, 38, 99),
    wellbeing: t.wellbeing,
  };
});

export const WORKLOAD_RECOMMENDATIONS: WorkloadRecommendation[] = [
  { id: "wr-1", title: "Move the Grade 9 Science unit test by four days", detail: "Three assessments land in the same week for 9A and 9B, creating a 14-hour grading spike.", impact: "Removes a 14-hour grading spike for 4 teachers", teachersAffected: ["Anil Kulkarni", "Suresh Patil", "Meera Iyer", "Kavita Rao"], category: "reschedule", savingHours: 14 },
  { id: "wr-2", title: "Adopt a shared rubric for English writing tasks", detail: "Four teachers are maintaining separate rubrics for the same writing outcomes.", impact: "Cuts grading time ~22% for writing tasks", teachersAffected: ["Shalini Verma", "Ritu Agarwal"], category: "shared-rubric", savingHours: 9 },
  { id: "wr-3", title: "Retire two duplicate weekly reports", detail: "Attendance summary and class-teacher digest contain the same figures.", impact: "Saves 3 hours per teacher per month", teachersAffected: ["All class teachers"], category: "remove-report", savingHours: 36 },
  { id: "wr-4", title: "Add lab-assistant support for Grade 10 practicals", detail: "Practical setup is consuming teaching preparation time.", impact: "Returns 6 hours per week to preparation", teachersAffected: ["Imran Sheikh", "Neha Chatterjee"], category: "support-staff", savingHours: 6 },
  { id: "wr-5", title: "Redistribute remedial duties in the Mathematics department", detail: "Two teachers hold 7 of 11 remedial slots.", impact: "Balances remedial load across 5 teachers", teachersAffected: ["Meera Iyer", "Deepak Shetty", "Kavita Rao"], category: "balance", savingHours: 5 },
  { id: "wr-6", title: "Share the Grade 9 question bank across sections", detail: "Sections are generating separate question sets for identical outcomes.", impact: "Avoids ~40 duplicate question entries per term", teachersAffected: ["Mathematics department"], category: "resources", savingHours: 7 },
];

export const PREDICTIONS: Prediction[] = [
  {
    id: "prd-1",
    subject: "School-wide",
    metric: "Attendance",
    scope: "Next 30 days",
    value: 91.4,
    unit: "%",
    ciLow: 89.1,
    ciHigh: 93.2,
    confidence: 0.86,
    horizon: "Dec 2025",
    requiresHumanReview: false,
    trend: [
      { label: "Aug", actual: 90 }, { label: "Sep", actual: 88 }, { label: "Oct", actual: 91 },
      { label: "Nov", actual: 93 }, { label: "Dec", predicted: 91.4 }, { label: "Jan", predicted: 90.2 },
    ],
  },
  {
    id: "prd-2",
    subject: "Grade 10",
    metric: "Board examination average",
    scope: "Grade 10 cohort",
    value: 76.8,
    unit: "%",
    ciLow: 72.4,
    ciHigh: 80.9,
    confidence: 0.74,
    horizon: "Mar 2026",
    requiresHumanReview: true,
    trend: [
      { label: "UT1", actual: 68 }, { label: "HY", actual: 72 }, { label: "UT2", actual: 74 },
      { label: "Pre-Board", predicted: 75.5 }, { label: "Board", predicted: 76.8 },
    ],
  },
  {
    id: "prd-3",
    subject: "Grade 9 — C",
    metric: "Homework completion",
    scope: "Class cohort",
    value: 68.2,
    unit: "%",
    ciLow: 61.5,
    ciHigh: 74.4,
    confidence: 0.71,
    horizon: "Dec 2025",
    requiresHumanReview: false,
    trend: [
      { label: "Sep", actual: 74 }, { label: "Oct", actual: 71 }, { label: "Nov", actual: 69 },
      { label: "Dec", predicted: 68.2 },
    ],
  },
  {
    id: "prd-4",
    subject: "School-wide",
    metric: "Dropout risk (students)",
    scope: "Grades 8–10",
    value: 11,
    unit: "students",
    ciLow: 7,
    ciHigh: 16,
    confidence: 0.69,
    horizon: "This academic year",
    requiresHumanReview: true,
    trend: [
      { label: "2023–24", actual: 14 }, { label: "2024–25", actual: 12 }, { label: "2025–26", predicted: 11 },
    ],
  },
  {
    id: "prd-5",
    subject: "Teaching staff",
    metric: "Workload index",
    scope: "Next week",
    value: 82,
    unit: "index",
    ciLow: 76,
    ciHigh: 88,
    confidence: 0.81,
    horizon: "Week 48",
    requiresHumanReview: false,
    trend: [
      { label: "W44", actual: 71 }, { label: "W45", actual: 76 }, { label: "W46", actual: 79 },
      { label: "W47", actual: 80 }, { label: "W48", predicted: 82 },
    ],
  },
  {
    id: "prd-6",
    subject: "Operations",
    metric: "Transport seat demand",
    scope: "Next term",
    value: 318,
    unit: "seats",
    ciLow: 296,
    ciHigh: 342,
    confidence: 0.78,
    horizon: "Jan 2026",
    requiresHumanReview: false,
    trend: [
      { label: "T1", actual: 284 }, { label: "T2", actual: 301 }, { label: "T3", predicted: 318 },
    ],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "scn-1",
    name: "Shift Grade 10 remedial blocks to Period 8",
    question: "If remedial Mathematics moves to the last period, what happens to attendance and teacher load?",
    category: "remedial",
    createdBy: "Dr. Vikram Nair",
    createdOn: "12/11/2025",
    assumptions: [
      "Transport departure stays at 15:40",
      "Remedial group size capped at 12 students",
      "Two Mathematics teachers available in Period 8",
    ],
    risks: [
      "Bus-dependent students may skip the last period",
      "Teacher fatigue in the final slot may lower session quality",
    ],
    outcomes: [
      { metric: "Remedial attendance", baseline: 78, projected: 66, unit: "%", ciLow: 60, ciHigh: 72 },
      { metric: "Teacher overload flags", baseline: 5, projected: 2, unit: "teachers", ciLow: 1, ciHigh: 3 },
      { metric: "Room conflicts", baseline: 4, projected: 0, unit: "conflicts", ciLow: 0, ciHigh: 1 },
    ],
    confidence: 0.72,
    status: "simulated",
  },
  {
    id: "scn-2",
    name: "Add one Science teacher for Grades 9–10",
    question: "What does one additional Science appointment do to workload and class averages?",
    category: "staffing",
    createdBy: "Sunita Deshpande",
    createdOn: "05/11/2025",
    assumptions: ["Appointment from January 2026", "Existing sections unchanged", "New teacher takes 22 periods"],
    risks: ["Recruitment lead time may slip by a month", "Onboarding lowers first-term effectiveness"],
    outcomes: [
      { metric: "Avg workload index", baseline: 82, projected: 71, unit: "index", ciLow: 67, ciHigh: 75 },
      { metric: "Science class average", baseline: 68, projected: 73, unit: "%", ciLow: 70, ciHigh: 76 },
      { metric: "Annual staff cost", baseline: 0, projected: 780000, unit: "₹", ciLow: 720000, ciHigh: 860000 },
    ],
    confidence: 0.68,
    status: "simulated",
  },
  {
    id: "scn-3",
    name: "Attendance contract for the 40 lowest-attendance students",
    question: "If we run weekly attendance contracts, how much does school attendance move?",
    category: "attendance",
    createdBy: "Dr. Vikram Nair",
    createdOn: "18/11/2025",
    assumptions: ["Class teachers make one call per week", "Parents reachable on the registered number"],
    risks: ["Adds 3 hours per week of class-teacher time", "Effect fades after six weeks without review"],
    outcomes: [
      { metric: "School attendance", baseline: 91, projected: 94, unit: "%", ciLow: 92, ciHigh: 95 },
      { metric: "Class-teacher hours", baseline: 0, projected: 3, unit: "hrs/week", ciLow: 2, ciHigh: 4 },
    ],
    confidence: 0.79,
    status: "adopted",
  },
  {
    id: "scn-4",
    name: "Convert Computer Lab 2 into two smaller rooms",
    question: "Does splitting the lab relieve room pressure without hurting practical time?",
    category: "rooms",
    createdBy: "Harish Agarwal",
    createdOn: "02/11/2025",
    assumptions: ["Capital work completes in the summer break", "24 workstations retained in total"],
    risks: ["Practical batch sizes drop below viable group work", "Capital cost may exceed the estimate"],
    outcomes: [
      { metric: "Room conflicts", baseline: 11, projected: 3, unit: "conflicts", ciLow: 2, ciHigh: 5 },
      { metric: "Practical minutes per student", baseline: 42, projected: 36, unit: "mins", ciLow: 33, ciHigh: 39 },
    ],
    confidence: 0.64,
    status: "draft",
  },
];

export const SCHOOL_TRENDS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((month, i) => ({
  month,
  performance: num((i + 1) * 3.3, 62, 79),
  attendance: num((i + 1) * 4.3, 86, 95),
  homework: num((i + 1) * 5.3, 68, 88),
  aiUsage: num((i + 1) * 6.3, 240, 1200),
}));

export const SUBJECT_DIFFICULTY = [
  { subject: "Mathematics", difficulty: 78, mastery: 62, timeSpent: 92 },
  { subject: "Science", difficulty: 71, mastery: 68, timeSpent: 84 },
  { subject: "Social Science", difficulty: 54, mastery: 76, timeSpent: 61 },
  { subject: "English", difficulty: 48, mastery: 81, timeSpent: 58 },
  { subject: "Hindi", difficulty: 44, mastery: 84, timeSpent: 52 },
  { subject: "Computer Science", difficulty: 66, mastery: 72, timeSpent: 74 },
];

export const RESOURCE_UTILISATION = [
  { resource: "Classrooms", utilisation: 88 },
  { resource: "Science labs", utilisation: 71 },
  { resource: "Computer labs", utilisation: 96 },
  { resource: "Library", utilisation: 54 },
  { resource: "Sports ground", utilisation: 62 },
  { resource: "Buses", utilisation: 81 },
];

export const YEAR_COMPARISON = [
  { metric: "Attendance", y2023: 89, y2024: 90, y2025: 93 },
  { metric: "Pass percentage", y2023: 94, y2024: 96, y2025: 97 },
  { metric: "Avg score", y2023: 68, y2024: 71, y2025: 74 },
  { metric: "Homework completion", y2023: 72, y2024: 78, y2025: 84 },
  { metric: "Parent engagement", y2023: 51, y2024: 63, y2025: 74 },
];
