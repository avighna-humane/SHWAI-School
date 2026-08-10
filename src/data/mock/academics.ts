import type {
  Assignment,
  AttendanceRecord,
  Exam,
  GradeEntry,
  Quiz,
  Submission,
  TimetableSlot,
} from "@/types";
import { CLASS_SECTIONS } from "./core";
import { DEMO_CLASS_STUDENTS, STUDENTS, TEACHERS } from "./people";

function rnd(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
function num(seed: number, min: number, max: number) {
  return Math.round(min + rnd(seed) * (max - min));
}

const ASSIGNMENT_SEEDS: [string, string, string[], string][] = [
  ["Quadratic Equations — Word Problems", "Mathematics", ["Quadratic equations", "Factorisation"], "Solve 12 word problems using factorisation and the quadratic formula. Show every step."],
  ["Chemical Reactions & Equations Worksheet", "Science", ["Balancing equations", "Types of reactions"], "Balance 15 equations and classify each reaction type with one real-life example."],
  ["Letter to the Editor — Water Conservation", "English", ["Formal letter", "Persuasive writing"], "Write a 150-word letter to the editor on responsible water usage in your locality."],
  ["पर्यायवाची एवं विलोम शब्द अभ्यास", "Hindi", ["Synonyms", "Antonyms"], "Complete the exercise on 20 synonym and 20 antonym pairs from Chapter 4."],
  ["Nationalism in India — Timeline Task", "Social Science", ["Non-cooperation movement", "Civil disobedience"], "Prepare an annotated timeline from 1918 to 1947 with five key turning points."],
  ["Python Loops — Practice Set", "Computer Science", ["for loops", "while loops", "Nested loops"], "Write 8 programs using loops. Attach output screenshots."],
  ["Light — Reflection Numericals", "Science", ["Mirror formula", "Magnification"], "Solve numericals 1–10 on the mirror formula and magnification."],
  ["Trigonometric Ratios Drill", "Mathematics", ["Trigonometric ratios", "Complementary angles"], "Complete the drill sheet of 20 questions on ratios and identities."],
  ["Diary Entry — A Day I Will Remember", "English", ["Creative writing", "Narrative voice"], "Write a 200-word diary entry with clear narrative voice and sensory detail."],
  ["Statistics — Mean, Median, Mode", "Mathematics", ["Central tendency", "Grouped data"], "Compute measures of central tendency for the three given grouped datasets."],
];

export const ASSIGNMENTS: Assignment[] = ASSIGNMENT_SEEDS.map(([title, subject, concepts, description], i) => {
  const n = i + 1;
  const cls = CLASS_SECTIONS[(i * 3 + 26) % CLASS_SECTIONS.length];
  const teacher = TEACHERS[i % TEACHERS.length];
  const submitted = num(n * 2.2, 14, 36);
  const late = num(n * 3.3, 0, 6);
  return {
    id: `asg-${n}`,
    title,
    subject,
    classId: cls.id,
    classLabel: cls.label,
    teacherId: teacher.id,
    teacher: teacher.name,
    assignedOn: `${num(n * 4.4, 1, 14)}/11/2025`,
    dueDate: `${num(n * 5.5, 15, 28)}/11/2025`,
    difficulty: (["easy", "medium", "hard"] as const)[i % 3],
    mode: (["online", "offline", "hybrid"] as const)[i % 3],
    submissionFormat: (["text", "file", "quiz", "worksheet"] as const)[i % 4],
    totalMarks: [10, 20, 25, 15][i % 4],
    submitted,
    pending: Math.max(0, cls.strength - submitted),
    late,
    aiGenerated: i % 3 === 0,
    concepts,
    status: i === 9 ? "draft" : i === 8 ? "closed" : "published",
    description,
    attachments:
      i % 2 === 0
        ? [{ name: `${subject.toLowerCase()}-worksheet-${n}.pdf`, size: "412 KB", type: "PDF" }]
        : [],
  };
});

export const SUBMISSIONS: Submission[] = DEMO_CLASS_STUDENTS.flatMap((s, i) =>
  ASSIGNMENTS.slice(0, 4).map((a, j) => {
    const seed = (i + 1) * (j + 3);
    const r = rnd(seed);
    const status = r > 0.86 ? "missing" : r > 0.74 ? "late" : r > 0.4 ? "graded" : "submitted";
    return {
      id: `sbm-${a.id}-${s.id}`,
      assignmentId: a.id,
      studentId: s.id,
      studentName: s.name,
      submittedOn: status === "missing" ? undefined : `${num(seed, 15, 27)}/11/2025, ${num(seed * 2, 8, 21)}:${String(num(seed * 3, 0, 59)).padStart(2, "0")}`,
      status: status as Submission["status"],
      marks: status === "graded" ? num(seed * 4, 4, a.totalMarks) : undefined,
      feedback:
        status === "graded"
          ? "Good structure. Watch out for sign errors when transposing terms."
          : undefined,
      aiFeedbackDraft:
        "Steps 1–3 are correct. The error appears when the negative term is moved across the equals sign — revisit transposition rules, then retry Q4 and Q7.",
      files: status === "missing" ? [] : [{ name: `${s.name.split(" ")[0].toLowerCase()}-${a.id}.pdf`, size: `${num(seed * 5, 120, 980)} KB` }],
    };
  }),
);

const ASSESSMENTS = ["Unit Test 1", "Class Test", "Half Yearly", "Project", "Practical"];
const SUBJECT_LIST = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"];

export const GRADE_ENTRIES: GradeEntry[] = DEMO_CLASS_STUDENTS.flatMap((s, i) =>
  SUBJECT_LIST.map((subject, j) => {
    const seed = (i + 2) * (j + 5);
    const maxMarks = 50;
    const marks = num(seed, 14, 50);
    const pct = (marks / maxMarks) * 100;
    return {
      id: `grd-${s.id}-${j}`,
      studentId: s.id,
      studentName: s.name,
      subject,
      assessment: ASSESSMENTS[j % ASSESSMENTS.length],
      term: (j % 2 === 0 ? "Term 1" : "Term 2") as GradeEntry["term"],
      marks,
      maxMarks,
      gradeLetter: pct >= 91 ? "A1" : pct >= 81 ? "A2" : pct >= 71 ? "B1" : pct >= 61 ? "B2" : pct >= 51 ? "C1" : pct >= 41 ? "C2" : "D",
      published: j < 4,
    };
  }),
);

export const EXAMS: Exam[] = [
  { id: "exm-1", name: "Unit Test 2 — Nov 2025", type: "Unit Test", grades: [6, 7, 8, 9, 10], startDate: "18/11/2025", endDate: "24/11/2025", status: "evaluating", subjectsCount: 6, papersReady: 6, avgScore: 71 },
  { id: "exm-2", name: "Half Yearly Examination 2025–26", type: "Half Yearly", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], startDate: "08/12/2025", endDate: "22/12/2025", status: "scheduled", subjectsCount: 9, papersReady: 5 },
  { id: "exm-3", name: "Pre-Board I — Grade 10", type: "Pre-Board", grades: [10], startDate: "12/01/2026", endDate: "24/01/2026", status: "scheduled", subjectsCount: 6, papersReady: 2 },
  { id: "exm-4", name: "Unit Test 1 — Aug 2025", type: "Unit Test", grades: [6, 7, 8, 9, 10], startDate: "12/08/2025", endDate: "18/08/2025", status: "published", subjectsCount: 6, papersReady: 6, avgScore: 68 },
  { id: "exm-5", name: "Science Practical Assessment", type: "Practical", grades: [9, 10, 11, 12], startDate: "02/12/2025", endDate: "06/12/2025", status: "scheduled", subjectsCount: 3, papersReady: 3 },
  { id: "exm-6", name: "Annual Examination 2024–25", type: "Annual", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], startDate: "03/03/2025", endDate: "22/03/2025", status: "published", subjectsCount: 9, papersReady: 9, avgScore: 74 },
];

export const QUIZZES: Quiz[] = [
  {
    id: "qz-1",
    title: "Quadratic Equations — Concept Check",
    subject: "Mathematics",
    grade: 9,
    durationMins: 20,
    status: "completed",
    scheduledFor: "14/11/2025, 10:30",
    avgScore: 68,
    attempts: 36,
    questions: [
      { id: "q1", type: "mcq", prompt: "The roots of x² − 5x + 6 = 0 are:", options: ["2 and 3", "−2 and −3", "1 and 6", "−1 and −6"], answer: "2 and 3", marks: 1, concept: "Factorisation", difficulty: "easy", aiGenerated: true },
      { id: "q2", type: "mcq", prompt: "For ax² + bx + c = 0, the discriminant is:", options: ["b² − 4ac", "4ac − b²", "b² + 4ac", "2b − 4ac"], answer: "b² − 4ac", marks: 1, concept: "Discriminant", difficulty: "easy", aiGenerated: true },
      { id: "q3", type: "short", prompt: "If the discriminant is zero, what can you say about the roots?", answer: "Roots are real and equal.", marks: 2, concept: "Nature of roots", difficulty: "medium", aiGenerated: true },
      { id: "q4", type: "long", prompt: "A rectangular plot has area 528 m² and its length is one more than twice its breadth. Find the dimensions.", answer: "Breadth 16 m, length 33 m.", marks: 4, concept: "Word problems", difficulty: "hard", aiGenerated: false },
      { id: "q5", type: "truefalse", prompt: "Every quadratic equation has at least one real root.", answer: "False", marks: 1, concept: "Nature of roots", difficulty: "medium", aiGenerated: true },
    ],
  },
  {
    id: "qz-2",
    title: "Chemical Reactions — Rapid Round",
    subject: "Science",
    grade: 9,
    durationMins: 15,
    status: "scheduled",
    scheduledFor: "29/11/2025, 09:15",
    attempts: 0,
    questions: [
      { id: "q1", type: "mcq", prompt: "Rusting of iron is an example of:", options: ["Combination", "Decomposition", "Oxidation", "Displacement"], answer: "Oxidation", marks: 1, concept: "Types of reactions", difficulty: "easy", aiGenerated: true },
      { id: "q2", type: "short", prompt: "Why is respiration considered an exothermic reaction?", answer: "It releases energy.", marks: 2, concept: "Exothermic reactions", difficulty: "medium", aiGenerated: true },
    ],
  },
  {
    id: "qz-3",
    title: "Nationalism in India — Recall Quiz",
    subject: "Social Science",
    grade: 10,
    durationMins: 25,
    status: "draft",
    scheduledFor: "02/12/2025, 11:00",
    attempts: 0,
    questions: [
      { id: "q1", type: "mcq", prompt: "The Non-Cooperation Movement was launched in:", options: ["1918", "1920", "1930", "1942"], answer: "1920", marks: 1, concept: "Non-cooperation movement", difficulty: "easy", aiGenerated: false },
    ],
  },
];

export const ATTENDANCE_TODAY: AttendanceRecord[] = DEMO_CLASS_STUDENTS.map((s, i) => {
  const r = rnd((i + 1) * 3.7);
  return {
    id: `att-${s.id}`,
    date: "21/11/2025",
    studentId: s.id,
    studentName: s.name,
    classId: s.classId,
    status: r > 0.92 ? "leave" : r > 0.84 ? "late" : r > 0.76 ? "absent" : "present",
    markedBy: "Meera Iyer",
    synced: r > 0.15,
  };
});

export const ATTENDANCE_TREND = [
  { label: "Jun", present: 94, absent: 4, late: 2 },
  { label: "Jul", present: 92, absent: 5, late: 3 },
  { label: "Aug", present: 90, absent: 7, late: 3 },
  { label: "Sep", present: 88, absent: 8, late: 4 },
  { label: "Oct", present: 91, absent: 6, late: 3 },
  { label: "Nov", present: 93, absent: 5, late: 2 },
];

const PERIOD_TIMES = [
  ["08:00", "08:45"], ["08:45", "09:30"], ["09:50", "10:35"], ["10:35", "11:20"],
  ["11:40", "12:25"], ["12:25", "13:10"], ["13:50", "14:35"], ["14:35", "15:20"],
];
const DAYS: TimetableSlot["day"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TIMETABLE: TimetableSlot[] = DAYS.flatMap((day, d) =>
  PERIOD_TIMES.map(([start, end], p) => {
    const seed = (d + 1) * (p + 2);
    const subject = SUBJECT_LIST[(d + p) % SUBJECT_LIST.length];
    const teacher = TEACHERS[(d * 3 + p) % TEACHERS.length];
    const isSub = seed % 17 === 0;
    return {
      id: `tt-${day}-${p + 1}`,
      day,
      period: p + 1,
      startTime: start,
      endTime: end,
      subject: p === 5 && d === 2 ? "Games" : subject,
      teacher: teacher.name,
      teacherId: teacher.id,
      classId: "cls-9A",
      room: "S-104",
      isSubstitute: isSub,
      conflict: seed % 23 === 0 ? "Teacher double-booked with Grade 10 — B" : undefined,
    };
  }),
);

export const SUBJECT_PERFORMANCE = SUBJECT_LIST.map((subject, i) => ({
  subject,
  average: num((i + 1) * 5.5, 56, 84),
  highest: num((i + 1) * 6.6, 88, 99),
  lowest: num((i + 1) * 7.7, 22, 48),
  passPct: num((i + 1) * 8.8, 72, 99),
}));

export const GRADE_DISTRIBUTION = ["A1", "A2", "B1", "B2", "C1", "C2", "D"].map((g, i) => ({
  grade: g,
  students: num((i + 1) * 9.9, 2, 34),
}));

export const CLASS_PERFORMANCE_TREND = ["UT1", "Class Test", "Half Yearly", "Project", "UT2"].map((t, i) => ({
  assessment: t,
  classAvg: num((i + 1) * 4.2, 58, 82),
  schoolAvg: num((i + 1) * 5.2, 60, 78),
  topper: num((i + 1) * 6.2, 88, 98),
}));

export const STUDENT_LOOKUP = new Map(STUDENTS.map((s) => [s.id, s]));
