import type { PlanId } from "@/types";
import { PLAN_RANK } from "./roles";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  versions: string;
  priceMin: number;
  priceMax: number;
  priceUnit: string;
  highlight?: boolean;
  includes: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Core school administration, digitised end to end.",
    versions: "Versions 1–2",
    priceMin: 25,
    priceMax: 50,
    priceUnit: "per student / year",
    includes: [
      "School administration",
      "Attendance",
      "Homework",
      "Gradebook",
      "Exams & assessments",
      "Timetable",
      "Communication",
      "Basic reports",
      "Basic portals",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "AI teaching and learning layered on top of operations.",
    versions: "Versions 1–4",
    priceMin: 75,
    priceMax: 100,
    priceUnit: "per student / year",
    highlight: true,
    includes: [
      "Everything in Starter",
      "AI learning & AI student tutor",
      "AI teacher assistant",
      "AI content generation",
      "Early-warning system",
      "Concept intelligence",
      "School analytics",
      "Automation",
      "Intervention workflows",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise AI",
    tagline: "The full AI-native school operating system.",
    versions: "Versions 1–6",
    priceMin: 150,
    priceMax: 250,
    priceUnit: "per student / year",
    includes: [
      "Everything in Professional",
      "Admissions, fees & transport",
      "Multi-campus operations",
      "What-if simulator",
      "Learning-debt map",
      "Intervention experiments",
      "Teacher workload optimiser",
      "Student context passport",
      "Student help network",
      "Offline & multilingual mode",
      "AI provenance & advanced governance",
      "Predictive intelligence + future AI products",
    ],
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

export function planAllows(current: PlanId, required: PlanId) {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export interface ComparisonRow {
  feature: string;
  group: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

export const FEATURE_COMPARISON: ComparisonRow[] = [
  { group: "Administration", feature: "Student information system", starter: true, professional: true, enterprise: true },
  { group: "Administration", feature: "Classes, sections & academic years", starter: true, professional: true, enterprise: true },
  { group: "Administration", feature: "Multi-campus operations", starter: false, professional: false, enterprise: true },
  { group: "Administration", feature: "Role-based access control", starter: "Basic", professional: "Granular", enterprise: "Granular + audit" },
  { group: "Academics", feature: "Homework & assignments", starter: true, professional: true, enterprise: true },
  { group: "Academics", feature: "Gradebook & report cards", starter: true, professional: "AI-assisted", enterprise: "AI-assisted + advanced" },
  { group: "Academics", feature: "Exams & quizzes", starter: true, professional: "AI generation", enterprise: "AI generation" },
  { group: "Academics", feature: "Timetable", starter: true, professional: true, enterprise: "AI scheduling" },
  { group: "AI", feature: "AI student tutor with progressive hints", starter: false, professional: true, enterprise: true },
  { group: "AI", feature: "AI teacher assistant", starter: false, professional: true, enterprise: true },
  { group: "AI", feature: "AI content studio", starter: false, professional: true, enterprise: true },
  { group: "AI", feature: "AI provenance & evidence panel", starter: false, professional: "Summary", enterprise: "Full provenance" },
  { group: "Intelligence", feature: "Early-warning system", starter: false, professional: true, enterprise: true },
  { group: "Intelligence", feature: "Concept & misconception intelligence", starter: false, professional: true, enterprise: true },
  { group: "Intelligence", feature: "School analytics dashboard", starter: "Basic reports", professional: true, enterprise: true },
  { group: "Intelligence", feature: "Predictive analytics", starter: false, professional: false, enterprise: true },
  { group: "Intelligence", feature: "Learning-debt map", starter: false, professional: false, enterprise: true },
  { group: "Support", feature: "Intervention workflows", starter: false, professional: true, enterprise: true },
  { group: "Support", feature: "Intervention experiment tracker", starter: false, professional: false, enterprise: true },
  { group: "Support", feature: "Student context passport", starter: false, professional: false, enterprise: true },
  { group: "Support", feature: "Student help network", starter: false, professional: false, enterprise: true },
  { group: "Operations", feature: "Admissions pipeline", starter: false, professional: false, enterprise: true },
  { group: "Operations", feature: "Fees, scholarships & receipts", starter: false, professional: false, enterprise: true },
  { group: "Operations", feature: "Transport & GPS tracking", starter: false, professional: false, enterprise: true },
  { group: "Operations", feature: "Library, inventory & facilities", starter: "Library only", professional: true, enterprise: true },
  { group: "Planning", feature: "What-if simulator", starter: false, professional: false, enterprise: true },
  { group: "Planning", feature: "Teacher workload optimiser", starter: false, professional: "Insights", enterprise: "Optimiser" },
  { group: "India-first", feature: "Offline attendance & marks entry", starter: false, professional: false, enterprise: true },
  { group: "India-first", feature: "Regional-language parent messaging", starter: "SMS", professional: "SMS + WhatsApp", enterprise: "All channels" },
  { group: "Governance", feature: "Audit & data-access logs", starter: false, professional: "Core logs", enterprise: "Full logs" },
  { group: "Governance", feature: "Data retention & deletion workflows", starter: false, professional: false, enterprise: true },
];

export interface UsageLimit {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

export const USAGE_LIMITS: UsageLimit[] = [
  { label: "Student licences", used: 1284, limit: 1500, unit: "students" },
  { label: "AI tutor sessions", used: 8940, limit: 15000, unit: "sessions / month" },
  { label: "AI content generations", used: 612, limit: 1000, unit: "generations / month" },
  { label: "SMS credits", used: 4210, limit: 6000, unit: "messages / month" },
  { label: "Document storage", used: 42, limit: 100, unit: "GB" },
];

export interface Invoice {
  id: string;
  number: string;
  date: string;
  period: string;
  students: number;
  ratePerStudent: number;
  subtotal: number;
  gst: number;
  total: number;
  status: "paid" | "due" | "overdue";
  method: string;
}

export const INVOICES: Invoice[] = [
  { id: "inv-1", number: "SHW/2025-26/0041", date: "01/04/2025", period: "Apr 2025 – Mar 2026", students: 1284, ratePerStudent: 190, subtotal: 243960, gst: 43913, total: 287873, status: "paid", method: "NEFT" },
  { id: "inv-2", number: "SHW/2024-25/0033", date: "01/04/2024", period: "Apr 2024 – Mar 2025", students: 1176, ratePerStudent: 175, subtotal: 205800, gst: 37044, total: 242844, status: "paid", method: "NEFT" },
  { id: "inv-3", number: "SHW/2025-26/0058", date: "01/10/2025", period: "Add-on licences (Oct 2025)", students: 108, ratePerStudent: 190, subtotal: 20520, gst: 3694, total: 24214, status: "due", method: "UPI" },
];
