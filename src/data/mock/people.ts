import type { Parent, RiskLevel, StaffMember, Student, Teacher } from "@/types";
import { CLASS_SECTIONS, HOUSES } from "./core";

const FIRST_M = ["Aarav", "Vihaan", "Arjun", "Rohan", "Kabir", "Aditya", "Ishaan", "Dhruv", "Rudra", "Karan", "Yash", "Neel", "Om", "Parth", "Sarthak", "Tanish", "Veer", "Ayaan", "Advik", "Nikhil"];
const FIRST_F = ["Ananya", "Diya", "Ishita", "Kavya", "Meher", "Riya", "Saanvi", "Tara", "Aditi", "Pihu", "Anvi", "Myra", "Navya", "Sara", "Trisha", "Ira", "Aarohi", "Vanya", "Shreya", "Nitya"];
const SURNAMES = ["Sharma", "Patil", "Iyer", "Deshpande", "Nair", "Reddy", "Gupta", "Joshi", "Kulkarni", "Menon", "Chatterjee", "Bhandari", "Rao", "Sheikh", "Gaikwad", "Verma", "Pillai", "Agarwal", "Kadam", "Shetty"];
const OCCUPATIONS = ["Software Engineer", "Bank Manager", "Doctor", "Shop Owner", "Government Officer", "Homemaker", "Chartered Accountant", "Farmer", "Civil Engineer", "Teacher", "Auto Driver", "Textile Trader"];

function rnd(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(rnd(seed) * arr.length) % arr.length]!;
}
function num(seed: number, min: number, max: number) {
  return Math.round(min + rnd(seed) * (max - min));
}

function riskFrom(attendance: number, score: number, hw: number): { level: RiskLevel; score: number } {
  const raw = Math.round(100 - (attendance * 0.4 + score * 0.35 + hw * 0.25));
  if (raw >= 40) return { level: "critical", score: raw };
  if (raw >= 32) return { level: "high", score: raw };
  if (raw >= 24) return { level: "medium", score: raw };
  if (raw >= 16) return { level: "low", score: raw };
  return { level: "none", score: raw };
}

export const STUDENTS: Student[] = (() => {
  const out: Student[] = [];
  let n = 0;
  for (const cls of CLASS_SECTIONS) {
    const count = cls.grade === 9 && cls.section === "A" ? 38 : 12; // richer data for the demo class
    for (let s = 0; s < count; s++) {
      n++;
      const female = rnd(n * 3.1) > 0.52;
      const first = female ? pick(FIRST_F, n * 1.7) : pick(FIRST_M, n * 1.7);
      const surname = pick(SURNAMES, n * 2.3);
      const attendancePct = num(n * 1.11, 62, 99);
      const avgScore = num(n * 1.31, 38, 97);
      const homeworkCompletion = num(n * 1.51, 45, 100);
      const risk = riskFrom(attendancePct, avgScore, homeworkCompletion);
      out.push({
        id: `stu-${n}`,
        admissionNo: `SPS/${2015 + (n % 10)}/${String(1000 + n)}`,
        name: `${first} ${surname}`,
        grade: cls.grade,
        section: cls.section,
        classId: cls.id,
        gender: female ? "Female" : "Male",
        dob: `${num(n * 4.4, 1, 28)}/${num(n * 5.5, 1, 12)}/${2025 - cls.grade - 5}`,
        guardianName: `${pick(rnd(n * 6) > 0.5 ? FIRST_M : FIRST_F, n * 6.6)} ${surname}`,
        guardianPhone: `+91 ${num(n * 7.7, 70, 99)}${String(num(n * 8.8, 10000000, 99999999)).padStart(8, "0")}`.slice(0, 18),
        parentId: `par-${(n % 40) + 1}`,
        attendancePct,
        avgScore,
        homeworkCompletion,
        riskLevel: risk.level,
        riskScore: risk.score,
        house: HOUSES[n % 4]!,
        transportRoute: rnd(n * 9.9) > 0.45 ? `Route ${(n % 6) + 1}` : undefined,
        feeStatus: rnd(n * 10.1) > 0.82 ? "overdue" : rnd(n * 10.1) > 0.68 ? "partial" : "paid",
        xp: num(n * 11.2, 320, 8600),
        level: num(n * 12.3, 1, 24),
        streak: num(n * 13.4, 0, 42),
        languages: rnd(n * 14.5) > 0.6 ? ["Marathi", "Hindi", "English"] : ["Hindi", "English"],
        status: "active",
        photoHue: num(n * 15.6, 0, 359),
      });
    }
  }
  return out;
})();

export const ALUMNI: Student[] = STUDENTS.slice(0, 24).map((s, i) => ({
  ...s,
  id: `alum-${i + 1}`,
  status: "alumni" as const,
  grade: 12,
  section: i % 2 === 0 ? "A" : "B",
}));

const TEACHER_NAMES = [
  ["Meera Iyer", "Mathematics"], ["Anil Kulkarni", "Science"], ["Shalini Verma", "English"],
  ["Rakesh Pillai", "Social Science"], ["Divya Menon", "Hindi"], ["Sanjay Joshi", "Computer Science"],
  ["Kavita Rao", "Mathematics"], ["Prakash Bhandari", "Physics"], ["Neha Chatterjee", "Biology"],
  ["Imran Sheikh", "Chemistry"], ["Lata Gaikwad", "Marathi"], ["Suresh Patil", "Science"],
  ["Ritu Agarwal", "English"], ["Deepak Shetty", "Mathematics"], ["Farah Khan", "Social Science"],
  ["Mohan Kadam", "Computer Science"], ["Sneha Reddy", "Hindi"], ["Vinod Gupta", "Physics"],
];

export const TEACHERS: Teacher[] = TEACHER_NAMES.map(([name, subject], i) => {
  const n = i + 1;
  const workloadIndex = num(n * 3.3, 42, 98);
  return {
    id: `tch-${n}`,
    employeeId: `EMP-${2100 + n}`,
    name: name!,
    subjects: [subject!, ...(rnd(n) > 0.7 ? ["Mathematics"] : [])],
    classes: CLASS_SECTIONS.filter((_, idx) => idx % 18 === i % 18).slice(0, 4).map((c) => c.label),
    phone: `+91 9${num(n * 2.2, 100000000, 899999999)}`.slice(0, 17),
    email: `${name!.split(" ")[0]!.toLowerCase()}.${name!.split(" ")[1]!.toLowerCase()}@sunrisepublic.edu.in`,
    experienceYears: num(n * 4.4, 2, 26),
    weeklyPeriods: num(n * 5.5, 18, 34),
    gradingBacklog: num(n * 6.6, 0, 96),
    workloadIndex,
    wellbeing: workloadIndex > 85 ? "strained" : workloadIndex > 70 ? "watch" : "healthy",
    attendancePct: num(n * 7.7, 88, 100),
    isClassTeacher: i < 12,
    photoHue: num(n * 8.8, 0, 359),
  };
});

export const PARENTS: Parent[] = Array.from({ length: 40 }, (_, i) => {
  const n = i + 1;
  const surname = pick(SURNAMES, n * 2.3);
  const father = rnd(n * 1.4) > 0.45;
  return {
    id: `par-${n}`,
    name: `${father ? pick(FIRST_M, n * 3.3) : pick(FIRST_F, n * 3.3)} ${surname}`,
    relation: father ? "Father" : rnd(n) > 0.15 ? "Mother" : "Guardian",
    phone: `+91 9${num(n * 5.1, 100000000, 899999999)}`.slice(0, 17),
    email: `${surname.toLowerCase()}.${n}@gmail.com`,
    occupation: pick(OCCUPATIONS, n * 6.2),
    wardIds: STUDENTS.filter((s) => s.parentId === `par-${n}`).map((s) => s.id).slice(0, 2),
    preferredLanguage: (["en", "hi", "mr", "ta"] as const)[n % 4]!,
    engagementScore: num(n * 7.3, 22, 98),
    photoHue: num(n * 8.4, 0, 359),
  };
});

const STAFF_ROLES: [string, string][] = [
  ["Office Superintendent", "Administration"], ["Accountant", "Finance"], ["Lab Assistant", "Science"],
  ["Librarian", "Library"], ["Sports Coach", "Physical Education"], ["Transport Coordinator", "Transport"],
  ["Nurse", "Health"], ["Counsellor", "Student Support"], ["IT Support Engineer", "Technology"],
  ["Housekeeping Supervisor", "Facilities"], ["Security Head", "Facilities"], ["Admissions Executive", "Admissions"],
];

export const STAFF: StaffMember[] = STAFF_ROLES.map(([designation, department], i) => {
  const n = i + 1;
  return {
    id: `stf-${n}`,
    name: `${rnd(n) > 0.5 ? pick(FIRST_M, n * 2.9) : pick(FIRST_F, n * 2.9)} ${pick(SURNAMES, n * 3.9)}`,
    designation: designation!,
    department: department!,
    phone: `+91 8${num(n * 4.9, 100000000, 899999999)}`.slice(0, 17),
    joinedOn: `${num(n * 5.9, 1, 28)}/0${num(n * 6.9, 1, 9)}/20${num(n * 7.9, 14, 24)}`,
    leaveBalance: num(n * 8.9, 2, 22),
    onLeave: rnd(n * 9.9) > 0.82,
    photoHue: num(n * 10.9, 0, 359),
  };
});

/** The demo class used across teacher-facing screens. */
export const DEMO_CLASS_ID = "cls-9A";
export const DEMO_CLASS_STUDENTS = STUDENTS.filter((s) => s.classId === DEMO_CLASS_ID);
export const DEMO_STUDENT = DEMO_CLASS_STUDENTS[0]!;
export const DEMO_TEACHER = TEACHERS[0]!;
export const DEMO_PARENT = PARENTS[0]!;
