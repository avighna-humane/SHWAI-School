/* eslint-disable react-refresh/only-export-components */

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
import { ROLE_LABEL } from "@/config/roles";
import {
  currentUser,
  listMemberships,
  switchSchool as switchSchoolAction,
  type AuthenticatedUser,
} from "@/actions/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/actions/notifications";
import { withTimeout } from "@/lib/request-timeout";

const STORAGE_KEY = "shwai.user.preferences";

export interface MembershipOption {
  id: string;
  school_id: string;
  school_name: string;
  role: Role;
  active: boolean;
}

interface PersistedPreferences {
  campusId: string;
  yearId: string;
  plan: PlanId;
  locale: Locale;
  offline: boolean;
}

export interface ShellNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationRow["severity"];
  createdAt: string;
  read: boolean;
}

const DEFAULTS: PersistedPreferences = {
  campusId: "cmp-1",
  yearId: "ay-2025",
  plan: "enterprise",
  locale: "en",
  offline: false,
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
  memberships: MembershipOption[];
  user: { name: string; sub: string; initials: string };
  setRole: (role: Role) => void;
  setSchoolId: (id: string) => void;
  switchSchool: (membershipId: string) => Promise<void>;
  setCampusId: (id: string) => void;
  setYearId: (id: string) => void;
  setPlan: (plan: PlanId) => void;
  setLocale: (locale: Locale) => void;
  setOffline: (offline: boolean) => void;
  notifications: ShellNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
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
  const membershipsQuery = useQuery({
    queryKey: ["current-user-memberships", authQuery.data?.userId],
    queryFn: () => listMemberships(),
    enabled: Boolean(authQuery.data?.userId),
    retry: false,
  });
  const notificationsQuery = useQuery({
    queryKey: ["current-user-notifications", authQuery.data?.userId, authQuery.data?.schoolId],
    queryFn: () => listNotifications(),
    enabled: Boolean(authQuery.data?.userId && authQuery.data?.schoolId),
    retry: false,
  });

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

  const refetchAuth = authQuery.refetch;
  const refetchMemberships = membershipsQuery.refetch;
  const refetchNotifications = notificationsQuery.refetch;
  const markRead = useCallback(
    (id: string) => {
      void markNotificationRead({ data: { id } })
        .then(() => refetchNotifications())
        .catch(() => undefined);
    },
    [refetchNotifications],
  );
  const markAllRead = useCallback(() => {
    void markAllNotificationsRead()
      .then(() => refetchNotifications())
      .catch(() => undefined);
  }, [refetchNotifications]);
  const switchSchool = useCallback(
    async (membershipId: string) => {
      await switchSchoolAction({ data: { membershipId } });
      await refetchAuth();
      await refetchMemberships();
    },
    [refetchAuth, refetchMemberships],
  );

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
    const notifications: ShellNotification[] = (notificationsQuery.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity,
      createdAt: new Date(row.created_at).toLocaleString(),
      read: Boolean(row.read_at),
    }));
    const readSet = new Set(
      notifications
        .filter((notification) => notification.read)
        .map((notification) => notification.id),
    );
    return {
      ...preferences,
      plan: (auth?.plan ?? "starter") as PlanId,
      isAuthenticated: Boolean(auth),
      authLoading: typeof window === "undefined" || authQuery.isLoading,
      authError: (authQuery.error as Error | null) ?? null,
      authUser: auth,
      userId: auth?.userId ?? "",
      schoolId: auth?.schoolId ?? "",
      role,
      school,
      year,
      memberships: membershipsQuery.data ?? [],
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
      switchSchool,
      setCampusId: (campusId) => update({ campusId }),
      setYearId: (yearId) => update({ yearId }),
      setPlan: () => {
        // Plan entitlements are server-controlled; billing/provider workflows update them.
      },
      setLocale: (locale) => update({ locale }),
      setOffline: (offline) => update({ offline }),
      notifications,
      markRead,
      markAllRead,
      isRead: (id) => readSet.has(id),
      unreadCount: notifications.filter((notification) => !notification.read).length,
    };
  }, [
    authQuery.data,
    authQuery.error,
    authQuery.isLoading,
    membershipsQuery.data,
    notificationsQuery.data,
    preferences,
    switchSchool,
    update,
    markAllRead,
    markRead,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
