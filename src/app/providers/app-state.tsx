import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Locale, PlanId, Role } from "@/types";
import { ACADEMIC_YEARS, SCHOOLS } from "@/data/mock/core";
import { NOTIFICATIONS } from "@/data/mock/platform";
import { ROLE_LABEL } from "@/config/roles";
import { currentUser, type AuthenticatedUser } from "@/actions/auth";
import { withTimeout } from "@/lib/request-timeout";

const STORAGE_KEY = "shwai.user.preferences";

interface PersistedPreferences {
  campusId: string;
  yearId: string;
  plan: PlanId;
  locale: Locale;
  offline: boolean;
  readIds: string[];
}

const DEFAULTS: PersistedPreferences = {
  campusId: "cmp-1",
  yearId: "ay-2025",
  plan: "enterprise",
  locale: "en",
  offline: false,
  readIds: NOTIFICATIONS.filter((notification) => notification.read).map(
    (notification) => notification.id,
  ),
};

interface AppStateValue extends PersistedPreferences {
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: Error | null;
  authUser: AuthenticatedUser | null;
  userId: string;
  schoolId: string;
  role: Role;
  school: (typeof SCHOOLS)[number];
  year: (typeof ACADEMIC_YEARS)[number];
  user: { name: string; sub: string; initials: string };
  setRole: (role: Role) => void;
  setSchoolId: (id: string) => void;
  setCampusId: (id: string) => void;
  setYearId: (id: string) => void;
  setPlan: (plan: PlanId) => void;
  setLocale: (locale: Locale) => void;
  setOffline: (offline: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markUnread: (id: string) => void;
  unreadCount: number;
  isRead: (id: string) => boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const authQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => withTimeout(currentUser(), 3000),
    enabled: typeof window !== "undefined",
    retry: false,
  });
  const [preferences, setPreferences] = useState<PersistedPreferences>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw)
        setPreferences({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedPreferences>) });
    } catch {
      // Preferences are non-sensitive convenience state only.
    }
  }, []);

  const update = useCallback((patch: Partial<PersistedPreferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota/private browsing errors.
      }
      return next;
    });
  }, []);

  const value = useMemo<AppStateValue>(() => {
    const auth = authQuery.data ?? null;
    const role = (auth?.role ?? "student") as Role;
    const school = auth
      ? {
          ...SCHOOLS[0]!,
          id: auth.schoolId,
          name: auth.schoolName,
          code: auth.schoolId,
          logoInitials: initials(auth.schoolName),
          students: 0,
          teachers: 0,
        }
      : SCHOOLS[0]!;
    const year =
      ACADEMIC_YEARS.find((item) => item.id === preferences.yearId) ?? ACADEMIC_YEARS[0]!;
    const readSet = new Set(preferences.readIds);
    return {
      ...preferences,
      isAuthenticated: Boolean(auth),
      authLoading: typeof window === "undefined" || authQuery.isLoading,
      authError: (authQuery.error as Error | null) ?? null,
      authUser: auth,
      userId: auth?.userId ?? "",
      schoolId: auth?.schoolId ?? "",
      role,
      school,
      year,
      user: auth
        ? {
            name: auth.name,
            sub: `${ROLE_LABEL[role]} · ${auth.schoolName}`,
            initials: initials(auth.name),
          }
        : { name: "Unauthenticated", sub: "Sign in required", initials: "?" },
      setRole: () => {
        // Role is resolved by the authenticated membership; there is intentionally no client role switch.
      },
      setSchoolId: () => {
        // School is resolved by the authenticated membership; there is intentionally no client school switch.
      },
      setCampusId: (campusId) => update({ campusId }),
      setYearId: (yearId) => update({ yearId }),
      setPlan: (plan) => update({ plan }),
      setLocale: (locale) => update({ locale }),
      setOffline: (offline) => update({ offline }),
      markRead: (id) => update({ readIds: Array.from(new Set([...preferences.readIds, id])) }),
      markUnread: (id) => update({ readIds: preferences.readIds.filter((item) => item !== id) }),
      markAllRead: () => update({ readIds: NOTIFICATIONS.map((notification) => notification.id) }),
      isRead: (id) => readSet.has(id),
      unreadCount: NOTIFICATIONS.filter(
        (notification) => notification.roles.includes(role) && !readSet.has(notification.id),
      ).length,
    };
  }, [authQuery.data, authQuery.error, authQuery.isLoading, preferences, update]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
