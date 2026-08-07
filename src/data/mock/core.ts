import type { AcademicYear, Campus, ClassSection, School, Subject } from "@/types";

export const CAMPUSES: Campus[] = [
  { id: "cmp-1", name: "Sunrise Public School — Kothrud", city: "Pune", students: 1284, isPrimary: true },
  { id: "cmp-2", name: "Sunrise Public School — Wakad", city: "Pune", students: 862, isPrimary: false },
  { id: "cmp-3", name: "Sunrise International — Nashik", city: "Nashik", students: 540, isPrimary: false },
];

export const SCHOOLS: School[] = [
  {
    id: "sch-1",
    name: "Sunrise Public School",
    code: "SPS-PN-01",
    board: "CBSE",
    city: "Pune",
    state: "Maharashtra",
    campuses: CAMPUSES,
    students: 1284,
    teachers: 78,
    plan: "enterprise",
    logoInitials: "SP",
  },
  {
    id: "sch-2",
    name: "Vidya Niketan English School",
    code: "VNE-NS-02",
    board: "State Board",
    city: "Nashik",
    state: "Maharashtra",
    campuses: [CAMPUSES[2]!],
    students: 540,
    teachers: 34,
    plan: "professional",
    logoInitials: "VN",
  },
  {
    id: "sch-3",
    name: "Gyan Deep Academy",
    code: "GDA-JP-03",
    board: "CBSE",
    city: "Jaipur",
    state: "Rajasthan",
    campuses: [{ id: "cmp-4", name: "Gyan Deep Academy — Malviya Nagar", city: "Jaipur", students: 410, isPrimary: true }],
    students: 410,
    teachers: 26,
    plan: "starter",
    logoInitials: "GD",
  },
];

export const ACADEMIC_YEARS: AcademicYear[] = [
  { id: "ay-2025", label: "2025–26", startDate: "01/04/2025", endDate: "31/03/2026", status: "active" },
  { id: "ay-2024", label: "2024–25", startDate: "01/04/2024", endDate: "31/03/2025", status: "closed" },
  { id: "ay-2023", label: "2023–24", startDate: "01/04/2023", endDate: "31/03/2024", status: "closed" },
  { id: "ay-2026", label: "2026–27", startDate: "01/04/2026", endDate: "31/03/2027", status: "planned" },
];

export const SUBJECTS: Subject[] = [
  { id: "sub-mat", name: "Mathematics", code: "MAT", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], colorToken: "primary" },
  { id: "sub-sci", name: "Science", code: "SCI", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], colorToken: "success" },
  { id: "sub-eng", name: "English", code: "ENG", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], colorToken: "info" },
  { id: "sub-hin", name: "Hindi", code: "HIN", grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], colorToken: "warning" },
  { id: "sub-sst", name: "Social Science", code: "SST", grades: [6, 7, 8, 9, 10], colorToken: "danger" },
  { id: "sub-cs", name: "Computer Science", code: "CS", grades: [6, 7, 8, 9, 10, 11, 12], colorToken: "ai" },
  { id: "sub-phy", name: "Physics", code: "PHY", grades: [11, 12], colorToken: "primary" },
  { id: "sub-chem", name: "Chemistry", code: "CHM", grades: [11, 12], colorToken: "success" },
  { id: "sub-bio", name: "Biology", code: "BIO", grades: [11, 12], colorToken: "info" },
  { id: "sub-mar", name: "Marathi", code: "MAR", grades: [1, 2, 3, 4, 5, 6, 7, 8], colorToken: "warning" },
];

const CLASS_TEACHERS = [
  "Meera Iyer",
  "Anil Kulkarni",
  "Shalini Verma",
  "Rakesh Pillai",
  "Divya Menon",
  "Sanjay Joshi",
  "Kavita Rao",
  "Prakash Bhandari",
  "Neha Chatterjee",
  "Imran Sheikh",
  "Lata Gaikwad",
  "Suresh Patil",
];

function seeded(n: number, min: number, max: number) {
  const x = Math.abs(Math.sin(n * 12.9898) * 43758.5453);
  return Math.round(min + (x % 1) * (max - min));
}

export const CLASS_SECTIONS: ClassSection[] = (() => {
  const out: ClassSection[] = [];
  let i = 0;
  for (let grade = 1; grade <= 12; grade++) {
    const sections = grade <= 10 ? ["A", "B", "C"] : ["A", "B"];
    for (const section of sections) {
      i++;
      out.push({
        id: `cls-${grade}${section}`,
        grade,
        section,
        label: `Grade ${grade} — ${section}`,
        classTeacherId: `tch-${(i % 12) + 1}`,
        classTeacher: CLASS_TEACHERS[i % 12]!,
        strength: seeded(i, 28, 44),
        room: `${grade <= 5 ? "P" : grade <= 8 ? "M" : "S"}-${100 + i}`,
        avgAttendance: seeded(i + 7, 82, 97),
        avgScore: seeded(i + 21, 58, 88),
      });
    }
  }
  return out;
})();

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const HOUSES = ["Aravalli", "Nilgiri", "Shivalik", "Vindhya"] as const;

export const LANGUAGES = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "mr", label: "Marathi", native: "मराठी" },
  { id: "ta", label: "Tamil", native: "தமிழ்" },
] as const;
