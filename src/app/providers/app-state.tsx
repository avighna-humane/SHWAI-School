import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale, PlanId, Role } from "@/types";
import { ACADEMIC_YEARS, SCHOOLS } from "@/data/mock/core";
import { NOTIFICATIONS } from "@/data/mock/platform";
import { DEMO_USER } from "@/config/roles";

const STORAGE_KEY = "shwai.demo.state";

interface PersistedState {
  role: Role;
  schoolId: string;
  campusId: string;
  yearId: string;
  plan: PlanId;
  locale: Locale;
  offline: boolean;
  readIds: string[];
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
};

interface AppStateValue extends PersistedState {
  user: { name: string; sub: string; initials: string };
  school: (typeof SCHOOLS)[number];
  year: (typeof ACADEMIC_YEARS)[number];
  setRole: (r: Role) => void;
  setSchoolId: (id: string) => void;
  setCampusId: (id: string) => void;
  setYearId: (id: string) => void;
  setPlan: (p: PlanId) => void;
  setLocale: (l: Locale) => void;
  setOffline: (v: boolean) => void;
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
      if (raw) setState({ ...DEFAULTS, ...(JSON.parse(raw) as PersistedState) });
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
    return {
      ...state,
      user: DEMO_USER[state.role],
      school,
      year,
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
