import type {
  AdmissionEnquiry,
  FeeRecord,
  InventoryItem,
  LibraryItem,
  TransportRoute,
} from "@/types";
import { STUDENTS } from "./people";

function rnd(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
function num(seed: number, min: number, max: number) {
  return Math.round(min + rnd(seed) * (max - min));
}

const FEE_HEADS = [
  { head: "Tuition Fee", amount: 24000 },
  { head: "Development Fee", amount: 6000 },
  { head: "Examination Fee", amount: 1800 },
  { head: "Library & Lab", amount: 2400 },
  { head: "Transport Fee", amount: 9600 },
];

export const FEE_RECORDS: FeeRecord[] = STUDENTS.slice(0, 60).map((s, i) => {
  const n = i + 1;
  const heads = FEE_HEADS.slice(0, s.transportRoute ? 5 : 4);
  const total = heads.reduce((a, h) => a + h.amount, 0);
  const concession = rnd(n * 2.1) > 0.85 ? 4000 : 0;
  const status = s.feeStatus;
  const paid = status === "paid" ? total - concession : status === "partial" ? Math.round((total - concession) * 0.55) : 0;
  return {
    id: `fee-${n}`,
    receiptNo: `RCPT/2025-26/${String(3000 + n)}`,
    studentId: s.id,
    studentName: s.name,
    classLabel: `Grade ${s.grade} — ${s.section}`,
    term: n % 3 === 0 ? "Installment 3" : n % 2 === 0 ? "Installment 2" : "Installment 1",
    headings: heads,
    total: total - concession,
    paid,
    dueDate: `${num(n * 3.1, 1, 28)}/12/2025`,
    status,
    method: paid > 0 ? (["UPI", "Net Banking", "Cash", "Cheque", "Card"] as const)[n % 5] : undefined,
    concession,
    scholarship: rnd(n * 4.1) > 0.9 ? "Merit Scholarship (State)" : undefined,
  };
});

export const FEE_COLLECTION_TREND = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => ({
  month: m,
  collected: num((i + 1) * 2.2, 1800000, 4200000),
  outstanding: num((i + 1) * 3.3, 220000, 890000),
}));

const APPLICANT_NAMES = [
  "Ridhi Kulkarni", "Shaurya Deshmukh", "Aanya Bhosale", "Vivaan Chaudhary", "Myra Salunkhe",
  "Reyansh Jadhav", "Kiara Wagh", "Atharv Pawar", "Naisha Bhagat", "Devansh Thorat",
  "Prisha Mane", "Ekansh Sawant", "Amaira Ghorpade", "Rudransh Shinde",
];

export const ADMISSIONS: AdmissionEnquiry[] = APPLICANT_NAMES.map((applicantName, i) => {
  const n = i + 1;
  const stages: AdmissionEnquiry["stage"][] = [
    "enquiry", "application", "documents", "entrance-test", "interview", "offer", "enrolled", "dropped",
  ];
  const stage = stages[i % stages.length];
  return {
    id: `adm-${n}`,
    applicantName,
    gradeApplied: num(n * 2.4, 1, 11),
    parentName: `${applicantName.split(" ")[1]} household`,
    phone: `+91 9${num(n * 3.4, 100000000, 899999999)}`.slice(0, 17),
    source: (["Walk-in", "Website", "Referral", "Advertisement"] as const)[i % 4],
    stage,
    createdOn: `${num(n * 4.4, 1, 28)}/10/2025`,
    followUpOn: `${num(n * 5.4, 22, 30)}/11/2025`,
    documentsVerified: num(n * 6.4, 1, 6),
    documentsTotal: 6,
    entranceScore: ["entrance-test", "interview", "offer", "enrolled"].includes(stage) ? num(n * 7.4, 42, 96) : undefined,
    aiFitScore: num(n * 8.4, 48, 96),
    owner: ["Sunita Deshpande", "Admissions Desk", "Priya Kale"][i % 3],
  };
});

export const TRANSPORT_ROUTES: TransportRoute[] = Array.from({ length: 6 }, (_, i) => {
  const n = i + 1;
  const stopNames = [
    ["Kothrud Depot", "Dahanukar Colony", "Karve Nagar", "Warje Bridge"],
    ["Wakad Chowk", "Kalewadi Phata", "Pimple Nilakh", "Rahatani"],
    ["Baner Gaon", "Balewadi Stadium", "Aundh Circle", "Sangvi"],
    ["Hadapsar Gadital", "Magarpatta Gate", "Kharadi Bypass", "Vimannagar"],
    ["Sinhagad Road", "Vitthalwadi", "Anand Nagar", "Nanded City"],
    ["Katraj Chowk", "Bharati Vidyapeeth", "Dhankawadi", "Bibvewadi"],
  ][i];
  return {
    id: `rt-${n}`,
    name: `Route ${n}`,
    busNo: `MH 12 ${["AB", "CD", "EF", "GH", "JK", "LM"][i]} ${1000 + n * 37}`,
    driver: ["Ramesh Yadav", "Sopan Tambe", "Iqbal Ansari", "Ganesh Dhumal", "Pravin More", "Sachin Bhoir"][i],
    driverPhone: `+91 9${num(n * 2.7, 100000000, 899999999)}`.slice(0, 17),
    attendant: ["Sunita Kale", "Mangal Pote", "Rekha Nikam", "Asha Jagtap", "Vaishali Bhide", "Shobha Pardeshi"][i],
    stops: stopNames.map((name, j) => ({
      name,
      time: `0${7 + Math.floor(j / 2)}:${["05", "20", "35", "50"][j]}`,
      students: num((n + 1) * (j + 2), 4, 16),
    })),
    studentsCount: num(n * 4.7, 28, 52),
    status: (["on-route", "at-school", "idle", "delayed", "on-route", "at-school"] as const)[i],
    delayMins: i === 3 ? 12 : undefined,
    gps: {
      lat: 18.5 + rnd(n) * 0.12,
      lng: 73.8 + rnd(n * 2) * 0.12,
      speedKmph: num(n * 5.7, 0, 42),
      updatedAt: "21/11/2025, 07:42",
    },
  };
});

export const LIBRARY_ITEMS: LibraryItem[] = [
  { id: "lib-1", title: "NCERT Mathematics — Class 9", author: "NCERT", category: "Textbook", isbn: "978-81-7450-489-4", copies: 60, available: 12 },
  { id: "lib-2", title: "NCERT Science — Class 10", author: "NCERT", category: "Textbook", isbn: "978-81-7450-644-7", copies: 55, available: 8 },
  { id: "lib-3", title: "Wings of Fire", author: "A. P. J. Abdul Kalam", category: "Biography", isbn: "978-81-7371-146-6", copies: 14, available: 3, issuedTo: "Aarav Sharma", dueDate: "28/11/2025" },
  { id: "lib-4", title: "Malgudi Days", author: "R. K. Narayan", category: "Fiction", isbn: "978-01-4306-621-8", copies: 18, available: 6 },
  { id: "lib-5", title: "गुनाहों का देवता", author: "Dharamvir Bharati", category: "Hindi Literature", isbn: "978-81-7016-045-3", copies: 10, available: 4 },
  { id: "lib-6", title: "Physics for Class 11 (Vol. 1)", author: "H. C. Verma", category: "Reference", isbn: "978-81-7709-187-1", copies: 24, available: 1, issuedTo: "Ishita Menon", dueDate: "24/11/2025" },
  { id: "lib-7", title: "Atlas of India", author: "Orient BlackSwan", category: "Reference", isbn: "978-81-2504-560-4", copies: 30, available: 22 },
  { id: "lib-8", title: "Python Crash Course", author: "Eric Matthes", category: "Computer Science", isbn: "978-15-9327-928-8", copies: 12, available: 5 },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: "inv-1", name: "Chemistry lab beakers (250 ml)", category: "Lab", quantity: 84, reorderLevel: 40, unitCost: 120, location: "Science Block — Store 1" },
  { id: "inv-2", name: "Whiteboard markers (box of 10)", category: "Stationery", quantity: 22, reorderLevel: 30, unitCost: 340, location: "Admin Store" },
  { id: "inv-3", name: "Student benches", category: "Furniture", quantity: 410, reorderLevel: 380, unitCost: 3200, location: "Main Block" },
  { id: "inv-4", name: "Projectors", category: "IT", quantity: 18, reorderLevel: 12, unitCost: 28000, location: "IT Store" },
  { id: "inv-5", name: "Cricket kits", category: "Sports", quantity: 6, reorderLevel: 8, unitCost: 7800, location: "Sports Room" },
  { id: "inv-6", name: "First-aid kits", category: "Health", quantity: 14, reorderLevel: 10, unitCost: 950, location: "Health Room" },
];

export const CLASSROOMS = [
  { id: "rm-1", name: "S-104", block: "Senior Block", capacity: 44, utilisation: 92, projector: true },
  { id: "rm-2", name: "S-105", block: "Senior Block", capacity: 44, utilisation: 78, projector: true },
  { id: "rm-3", name: "M-210", block: "Middle Block", capacity: 40, utilisation: 64, projector: false },
  { id: "rm-4", name: "P-108", block: "Primary Block", capacity: 36, utilisation: 88, projector: false },
  { id: "rm-5", name: "Physics Lab", block: "Science Block", capacity: 32, utilisation: 71, projector: true },
  { id: "rm-6", name: "Computer Lab 2", block: "Science Block", capacity: 30, utilisation: 96, projector: true },
];

export const CERTIFICATES = [
  { id: "cert-1", name: "Bonafide Certificate", pending: 4, issuedThisMonth: 27, template: "SPS/BON/2025" },
  { id: "cert-2", name: "Transfer Certificate", pending: 2, issuedThisMonth: 9, template: "SPS/TC/2025" },
  { id: "cert-3", name: "Character Certificate", pending: 0, issuedThisMonth: 14, template: "SPS/CHR/2025" },
  { id: "cert-4", name: "Sports Participation", pending: 11, issuedThisMonth: 38, template: "SPS/SPT/2025" },
];

export const STAFF_LEAVE_REQUESTS = [
  { id: "lv-1", name: "Anil Kulkarni", type: "Casual Leave", from: "24/11/2025", to: "25/11/2025", days: 2, reason: "Family function", status: "pending", substitute: "Suresh Patil" },
  { id: "lv-2", name: "Divya Menon", type: "Medical Leave", from: "20/11/2025", to: "22/11/2025", days: 3, reason: "Viral fever", status: "approved", substitute: "Sneha Reddy" },
  { id: "lv-3", name: "Ramesh Yadav", type: "Earned Leave", from: "01/12/2025", to: "05/12/2025", days: 5, reason: "Village visit", status: "pending", substitute: "Sopan Tambe" },
  { id: "lv-4", name: "Ritu Agarwal", type: "Casual Leave", from: "18/11/2025", to: "18/11/2025", days: 1, reason: "Personal", status: "rejected", substitute: "—" },
];

export const PAYROLL_SUMMARY = [
  { month: "Sep 2025", staff: 112, gross: 4820000, deductions: 486000, net: 4334000, status: "Disbursed" },
  { month: "Oct 2025", staff: 114, gross: 4910000, deductions: 494000, net: 4416000, status: "Disbursed" },
  { month: "Nov 2025", staff: 114, gross: 4930000, deductions: 497000, net: 4433000, status: "Pending export" },
];
