import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale, PlanId, Role } from "@/types";
import { ACADEMIC_YEARS, SCHOOLS } from "@/data/mock/core";
import { NOTIFICATIONS } from "@/data/mock/platform";
import { DEMO_USER } from "@/config/roles";
import { DEMO_CLASS_STUDENTS, DEMO_STUDENT, DEMO_TEACHER, TEACHERS } from "@/data/mock/people";
import { PRINCIPAL_ACTOR } from "@/server/auth-context";

const STORAGE_KEY = "shwai.demo.state";

/** Teachers assigned to Grade 9 — A, used by the "Acting as" picker in Settings. */
export const ACTABLE_TEACHERS = TEACHERS.filter((t) => t.classes.includes("Grade 9 — A"));
/** First 5 Grade 9-A students, used by the "Acting as" picker in Settings. */
export const ACTABLE_STUDENTS = DEMO_CLASS_STUDENTS.slice(0, 5);

interface PersistedState {
  role: Role;
  schoolId: string;
  campusId: string;
  yearId: string;
  plan: PlanId;
  locale: Locale;
  offline: boolean;
  readIds: string[];
  studentId: string;
  teacherId: string;
}

const DEFAULTS: PersistedState = {
  role: "principal",
  schoolId: "sch-1",
  campusId: "cmp-1",
  yearId: "ay-2025",
  plan: "enterprise",
  locale: "en",
  offline: false,
  readIds: NOTIFICATIONS.filter((n) => n.read).map((n) => n.id),
  studentId: DEMO_STUDENT.id,
  teacherId: DEMO_TEACHER.id,
};

export interface Actor {
  id: string;
  name: string;
  schoolId: string;
}

interface AppStateValue extends PersistedState {
  user: { name: string; sub: string; initials: string };
  school: (typeof SCHOOLS)[number];
  year: (typeof ACADEMIC_YEARS)[number];
  actor: Actor;
  setRole: (r: Role) => void;
  setSchoolId: (id: string) => void;
  setCampusId: (id: string) => void;
  setYearId: (id: string) => void;
  setPlan: (p: PlanId) => void;
  setLocale: (l: Locale) => void;
  setOffline: (v: boolean) => void;
  setStudentId: (id: string) => void;
  setTeacherId: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markUnread: (id: string) => void;
  unreadCount: number;
  isRead: (id: string) => boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as PersistedState;
        setState({ ...DEFAULTS, ...stored, role: stored.role === "admin" ? "principal" : stored.role });
      }
    } catch {
      /* demo-only persistence */
    }
  }, []);

  const update = useCallback((patch: Partial<PersistedState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<AppStateValue>(() => {
    const school = SCHOOLS.find((s) => s.id === state.schoolId) ?? SCHOOLS[0];
    const year = ACADEMIC_YEARS.find((y) => y.id === state.yearId) ?? ACADEMIC_YEARS[0];
    const readSet = new Set(state.readIds);

    const actor: Actor =
      state.role === "student"
        ? (() => {
            const s = ACTABLE_STUDENTS.find((x) => x.id === state.studentId) ?? DEMO_STUDENT;
            return { id: s.id, name: s.name, schoolId: "sch-1" };
          })()
        : state.role === "teacher"
          ? (() => {
              const t = ACTABLE_TEACHERS.find((x) => x.id === state.teacherId) ?? DEMO_TEACHER;
              return { id: t.id, name: t.name, schoolId: "sch-1" };
            })()
          : { id: PRINCIPAL_ACTOR.id, name: PRINCIPAL_ACTOR.name, schoolId: "sch-1" };

    return {
      ...state,
       user: DEMO_USER[state.role],
      school,
      year,
      actor,
      setRole: (role) => update({ role }),
      setSchoolId: (schoolId) => {
        const s = SCHOOLS.find((x) => x.id === schoolId);
        update({ schoolId, campusId: s?.campuses[0]?.id ?? "", plan: s?.plan ?? "enterprise" });
      },
      setCampusId: (campusId) => update({ campusId }),
      setYearId: (yearId) => update({ yearId }),
      setPlan: (plan) => update({ plan }),
      setLocale: (locale) => update({ locale }),
      setOffline: (offline) => update({ offline }),
      setStudentId: (studentId) => update({ studentId }),
      setTeacherId: (teacherId) => update({ teacherId }),
      markRead: (id) => update({ readIds: Array.from(new Set([...state.readIds, id])) }),
      markUnread: (id) => update({ readIds: state.readIds.filter((x) => x !== id) }),
      markAllRead: () => update({ readIds: NOTIFICATIONS.map((n) => n.id) }),
      isRead: (id) => readSet.has(id),
      unreadCount: NOTIFICATIONS.filter((n) => n.roles.includes(state.role) && !readSet.has(n.id)).length,
    };
  }, [state, update]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
