import type { HelpMatch, Intervention, InterventionExperiment, StudentContextEntry } from "@/types";
import { STUDENTS } from "./people";

function rnd(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
function num(seed: number, min: number, max: number) {
  return Math.round(min + rnd(seed) * (max - min));
}

const PROBLEMS: [Intervention["type"], string, string, string][] = [
  [
    "attendance",
    "Attendance dropped from 94% to 71% over six weeks",
    "Weekly attendance contract with guardian call-back",
    "Attendance 71% (30-day window)",
  ],
  [
    "academic",
    "Mathematics score fell 19 marks between UT1 and UT2",
    "Small-group remedial on factorisation, re-test in 10 days",
    "UT2 Mathematics: 41/100",
  ],
  [
    "homework",
    "Seven consecutive missed homework submissions",
    "Daily homework check-in with the class teacher for two weeks",
    "Homework completion 46%",
  ],
  [
    "wellbeing",
    "Withdrawal from group work reported by two teachers",
    "Counsellor conversation and a temporary support plan",
    "Engagement index 34/100",
  ],
  [
    "behaviour",
    "Three classroom disruption notes in one fortnight",
    "Restorative conversation and seating change",
    "3 behaviour notes in 14 days",
  ],
];

export const INTERVENTIONS: Intervention[] = STUDENTS.filter((s) => s.riskScore > 26)
  .slice(0, 18)
  .map((s, i) => {
    const n = i + 1;
    const [type, problem, recommended, baseline] = PROBLEMS[n % PROBLEMS.length];
    const status = (["open", "in-progress", "completed", "escalated"] as const)[n % 4];
    return {
      id: `int-${n}`,
      studentId: s.id,
      studentName: s.name,
      classLabel: `Grade ${s.grade} — ${s.section}`,
      problem,
      type,
      recommended,
      ownerRole: (["Teacher", "Counsellor", "Administrator"] as const)[n % 3],
      owner: ["Meera Iyer", "Divya Menon (Counsellor)", "Sunita Deshpande"][n % 3],
      assignedOn: `${num(n * 2.8, 1, 14)}/11/2025`,
      followUpOn: `${num(n * 3.8, 22, 30)}/11/2025`,
      status,
      baseline,
      outcome:
        status === "completed"
          ? "Attendance recovered to 88% and homework completion to 79%."
          : undefined,
      improvementPct: status === "completed" ? num(n * 4.8, 6, 34) : undefined,
      parentAcknowledged: rnd(n * 5.8) > 0.42,
      history: [
        {
          at: `${num(n * 2.8, 1, 14)}/11/2025`,
          note: "Case created from early-warning alert.",
          by: "SHWAI early warning",
        },
        {
          at: `${num(n * 6.8, 15, 18)}/11/2025`,
          note: "Guardian contacted on the registered number; support plan explained.",
          by: "Meera Iyer",
        },
        ...(status === "escalated"
          ? [
              {
                at: "20/11/2025",
                note: "No response after two follow-ups — escalated to administrator.",
                by: "System escalation",
              },
            ]
          : []),
        ...(status === "completed"
          ? [
              {
                at: "21/11/2025",
                note: "Post-intervention measurement recorded. Case closed.",
                by: "Meera Iyer",
              },
            ]
          : []),
      ],
    };
  });

export const EXPERIMENTS: InterventionExperiment[] = [
  {
    id: "exp-1",
    title: "Ten-minute daily retrieval practice — Grade 9 Mathematics",
    problem: "Factorisation errors persisting after the unit was taught",
    intervention:
      "Ten-minute retrieval quiz at the start of every Mathematics period for three weeks",
    studentsInvolved: 76,
    classesInvolved: ["Grade 9 — A", "Grade 9 — B"],
    expectedImprovement: "+8 marks on the concept re-test",
    baselineValue: 54,
    postValue: 67,
    metric: "Concept mastery %",
    reviewDate: "28/11/2025",
    owner: "Meera Iyer",
    status: "completed",
    successRate: 82,
    verdict: "worked",
  },
  {
    id: "exp-2",
    title: "Parent SMS nudge before homework due dates",
    problem: "Late and missing submissions in Grades 6–8",
    intervention: "Regional-language SMS to guardians 18 hours before each due date",
    studentsInvolved: 214,
    classesInvolved: ["Grade 6", "Grade 7", "Grade 8"],
    expectedImprovement: "+10% on-time submissions",
    baselineValue: 71,
    postValue: 84,
    metric: "On-time submission %",
    reviewDate: "15/11/2025",
    owner: "Sunita Deshpande",
    status: "completed",
    successRate: 91,
    verdict: "worked",
  },
  {
    id: "exp-3",
    title: "Peer tutoring pairs for Science numericals",
    problem: "Sign-convention errors in Light numericals",
    intervention: "Grade 10 peer tutors paired with Grade 9 students twice a week",
    studentsInvolved: 32,
    classesInvolved: ["Grade 9 — A", "Grade 10 — A"],
    expectedImprovement: "+12% on numerical items",
    baselineValue: 48,
    metric: "Numerical accuracy %",
    reviewDate: "05/12/2025",
    owner: "Anil Kulkarni",
    status: "running",
  },
  {
    id: "exp-4",
    title: "Attendance contract with weekly review",
    problem: "Chronic absence among 40 students",
    intervention: "Signed contract, weekly guardian call and Friday review",
    studentsInvolved: 40,
    classesInvolved: ["Grades 8–10"],
    expectedImprovement: "+3% school attendance",
    baselineValue: 71,
    postValue: 79,
    metric: "Attendance %",
    reviewDate: "22/11/2025",
    owner: "Dr. Vikram Nair",
    status: "review-due",
    successRate: 64,
    verdict: "partial",
  },
  {
    id: "exp-5",
    title: "Reading fluency block before Hindi comprehension",
    problem: "Comprehension scores lagging behind grammar scores",
    intervention: "Fifteen-minute paired reading block twice a week",
    studentsInvolved: 58,
    classesInvolved: ["Grade 6 — A", "Grade 7 — B"],
    expectedImprovement: "+6 marks in comprehension",
    baselineValue: 62,
    metric: "Comprehension %",
    reviewDate: "12/12/2025",
    owner: "Divya Menon",
    status: "planned",
  },
  {
    id: "exp-6",
    title: "Worked-example first, practice second (Trigonometry)",
    problem: "Grade 10 students stalling on multi-step ratio problems",
    intervention: "Two fully worked examples before independent practice",
    studentsInvolved: 84,
    classesInvolved: ["Grade 10 — A", "Grade 10 — B"],
    expectedImprovement: "+9% accuracy",
    baselineValue: 57,
    postValue: 58,
    metric: "Accuracy %",
    reviewDate: "10/11/2025",
    owner: "Deepak Shetty",
    status: "completed",
    successRate: 12,
    verdict: "no-effect",
  },
];

export const INTERVENTION_LIBRARY = [
  {
    id: "libi-1",
    name: "Ten-minute retrieval practice",
    problem: "Concept decay after teaching",
    evidence: "Worked in 4 of 5 school trials",
    avgImprovement: "+11 mastery points",
    effort: "Low",
  },
  {
    id: "libi-2",
    name: "Guardian SMS nudge before due dates",
    problem: "Late or missing homework",
    evidence: "Worked in 3 of 3 trials",
    avgImprovement: "+13% on-time submissions",
    effort: "Low",
  },
  {
    id: "libi-3",
    name: "Attendance contract with weekly review",
    problem: "Chronic absence",
    evidence: "Partial in 2 of 3 trials",
    avgImprovement: "+6% attendance",
    effort: "Medium",
  },
  {
    id: "libi-4",
    name: "Peer tutoring pairs",
    problem: "Procedural errors in numericals",
    evidence: "Running — 1 trial",
    avgImprovement: "Pending review",
    effort: "Medium",
  },
  {
    id: "libi-5",
    name: "Prerequisite revision block",
    problem: "Missing prerequisite skills",
    evidence: "Worked in 2 of 2 trials",
    avgImprovement: "+15 mastery points",
    effort: "High",
  },
  {
    id: "libi-6",
    name: "Worked-example first sequencing",
    problem: "Multi-step problem stalling",
    evidence: "No effect in 1 trial",
    avgImprovement: "+1%",
    effort: "Low",
  },
];

const CONTEXT_SEEDS: [StudentContextEntry["category"], string, string][] = [
  [
    "school-transfer",
    "Joined in October from a State Board school; syllabus gap in Grade 8 Science.",
    "Bridge worksheets for two units; review in January.",
  ],
  [
    "language-support",
    "Home language is Marathi; needs glossary support for English science terms.",
    "Bilingual glossary and extra 10 minutes in written assessments.",
  ],
  [
    "health-accommodation",
    "Diagnosed with low vision; requires front-row seating and large-print handouts.",
    "Front-row seating, 18pt print, digital copies shared with the guardian.",
  ],
  [
    "family-circumstance",
    "Family relocation in progress; two weeks of disrupted routine expected.",
    "Flexible submission dates until 15/12/2025.",
  ],
  [
    "transport",
    "Travels 22 km on Route 4; frequently arrives 10 minutes late in monsoon.",
    "Late arrival not counted against punctuality between June and September.",
  ],
  [
    "caregiving",
    "Cares for a younger sibling on two afternoons a week.",
    "Remedial slots scheduled on Tuesday and Thursday mornings only.",
  ],
];

export const CONTEXT_ENTRIES: StudentContextEntry[] = CONTEXT_SEEDS.map(
  ([category, summary, supportPlan], i) => {
    const s = STUDENTS[i * 3 + 1];
    const n = i + 1;
    return {
      id: `ctx-${n}`,
      studentId: s.id,
      studentName: s.name,
      category,
      summary,
      consentBy: `${s.guardianName} (Guardian)`,
      consentOn: `${num(n * 2.4, 1, 28)}/09/2025`,
      expiresOn: `${num(n * 3.4, 1, 28)}/03/2026`,
      visibleTo: ["Class teacher", "Subject teachers", "Counsellor"].slice(0, (n % 3) + 1),
      source: (["Parent", "Staff", "Counsellor"] as const)[n % 3],
      supportPlan,
      accessLog: [
        {
          by: "Meera Iyer",
          role: "Class Teacher",
          at: `${num(n * 4.4, 10, 20)}/11/2025, 09:14`,
          reason: "Planning seating and assessment support",
        },
        {
          by: "Divya Menon",
          role: "Counsellor",
          at: `${num(n * 5.4, 10, 20)}/11/2025, 15:02`,
          reason: "Reviewing temporary support plan",
        },
      ],
    };
  },
);

const HELP_TOPICS: [string, string][] = [
  ["Factorisation of quadratics", "Mathematics"],
  ["Mirror formula & sign convention", "Science"],
  ["Formal letter writing", "English"],
  ["समास एवं संधि", "Hindi"],
  ["Nested loops in Python", "Computer Science"],
  ["Federalism", "Social Science"],
];

export const HELP_MATCHES: HelpMatch[] = HELP_TOPICS.flatMap(([topic, subject], i) =>
  (["peer-tutor", "office-hour", "remedial-group"] as const).map((matchType, j) => {
    const n = (i + 1) * (j + 2);
    const s = STUDENTS[n % STUDENTS.length];
    return {
      id: `hm-${i}-${j}`,
      studentId: s.id,
      studentName: s.name,
      topic,
      subject,
      matchType,
      matchName:
        matchType === "peer-tutor"
          ? `${["Ishita Menon", "Kabir Reddy", "Saanvi Joshi", "Arjun Nair"][n % 4]} (Grade ${10 + (n % 2)})`
          : matchType === "office-hour"
            ? `${["Meera Iyer", "Anil Kulkarni", "Shalini Verma"][n % 3]} — office hour`
            : `Remedial group ${String.fromCharCode(65 + (n % 4))}`,
      language: ["English", "Hindi", "Marathi"][n % 3],
      slot: `${["Mon", "Tue", "Wed", "Thu", "Fri"][n % 5]} · ${["13:50", "14:35", "15:20"][n % 3]}`,
      masteryOfHelper: matchType === "peer-tutor" ? num(n * 2.7, 82, 98) : undefined,
      helperWorkload: (["light", "moderate", "heavy"] as const)[n % 3],
      status: (["suggested", "accepted", "completed"] as const)[n % 3],
      credits: matchType === "peer-tutor" ? num(n * 3.7, 2, 24) : undefined,
    };
  }),
);

export const PEER_TUTORS = [
  {
    id: "pt-1",
    name: "Ishita Menon",
    grade: 11,
    strengths: ["Trigonometry", "Statistics"],
    languages: ["English", "Malayalam"],
    credits: 42,
    sessions: 18,
    certified: true,
    workload: "moderate",
  },
  {
    id: "pt-2",
    name: "Kabir Reddy",
    grade: 12,
    strengths: ["Physics numericals", "Algebra"],
    languages: ["English", "Telugu", "Hindi"],
    credits: 61,
    sessions: 26,
    certified: true,
    workload: "heavy",
  },
  {
    id: "pt-3",
    name: "Saanvi Joshi",
    grade: 10,
    strengths: ["Hindi grammar", "Essay writing"],
    languages: ["Hindi", "Marathi"],
    credits: 24,
    sessions: 11,
    certified: true,
    workload: "light",
  },
  {
    id: "pt-4",
    name: "Arjun Nair",
    grade: 11,
    strengths: ["Python", "Logic building"],
    languages: ["English"],
    credits: 33,
    sessions: 15,
    certified: false,
    workload: "light",
  },
];

export const EXTERNAL_RESOURCES = [
  {
    id: "er-1",
    title: "NCERT exemplar — Quadratic Equations",
    provider: "NCERT",
    type: "Practice set",
    verified: true,
    language: "English / Hindi",
  },
  {
    id: "er-2",
    title: "DIKSHA module — Light: Reflection & Refraction",
    provider: "DIKSHA (MoE)",
    type: "Video + quiz",
    verified: true,
    language: "English / Marathi",
  },
  {
    id: "er-3",
    title: "e-Pathshala Hindi Vyakaran practice",
    provider: "e-Pathshala",
    type: "Worksheet",
    verified: true,
    language: "Hindi",
  },
  {
    id: "er-4",
    title: "School library reference — H. C. Verma Vol. 1",
    provider: "School library",
    type: "Book",
    verified: true,
    language: "English",
  },
];
