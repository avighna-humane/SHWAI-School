import { useMemo, useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { AppStateProvider, useAppState } from "@/app/providers/app-state";
import { MOBILE_NAV, NAV_GROUPS, findNavItem, navForRole } from "@/config/navigation";
import { ROLE_LABEL } from "@/config/roles";
import { planAllows } from "@/config/plans";
import { ACADEMIC_YEARS } from "@/data/mock/core";
import { SCHOOLS } from "@/data/mock/core";
import { NOTIFICATIONS, SYSTEM_STATUS } from "@/data/mock/platform";
import { LANGUAGES } from "@/data/mock/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Role } from "@/types";

export const Route = createFileRoute("/app")({
  component: () => (
    <AppStateProvider>
      <TooltipProvider delayDuration={200}>
        <Shell />
      </TooltipProvider>
    </AppStateProvider>
  ),
});

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C className={className} aria-hidden />;
}

function Shell() {
  const state = useAppState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const groups = useMemo(() => navForRole(state.role), [state.role]);
  const current = findNavItem(pathname);
  const mobileItems = MOBILE_NAV[state.role]
    .map((p) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.path === p))
    .filter(Boolean);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex",
          collapsed ? "w-[68px]" : "w-[264px]",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
          <img src="/logo-mark.png" alt="SHWAI Logo" className="size-9 shrink-0 object-contain" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight">SHWAI</p>
              <p className="truncate text-[11px] text-muted-foreground">School Operating System</p>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <nav className="px-2 py-3" aria-label="Main navigation">
            {groups.map((group) => (
              <div key={group.label} className="mb-3">
                {!collapsed && (
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const locked = item.plan ? !planAllows(state.plan, item.plan) : false;
                    return (
                      <li key={item.path}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.path}
                              activeOptions={{ exact: item.path === "/app" }}
                              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-primary-soft data-[status=active]:font-semibold data-[status=active]:text-primary"
                            >
                              <Icon name={item.icon} className="size-[18px] shrink-0" />
                              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                              {!collapsed && locked && <Icons.Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Locked in your plan" />}
                              {!collapsed && !locked && item.badge && (
                                <span className="shrink-0 rounded bg-ai-soft px-1.5 py-0.5 text-[10px] font-semibold text-ai">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">{item.label}</p>
                            <p className="max-w-[220px] text-xs opacity-80">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <Icons.PanelLeftOpen className="size-4" aria-hidden /> : <Icons.PanelLeftClose className="size-4" aria-hidden />}
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                    <Icons.Menu className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle>SHWAI</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-64px)] px-2 py-3">
                    {groups.map((g) => (
                      <div key={g.label} className="mb-3">
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
                        {g.items.map((i) => (
                          <Link key={i.path} to={i.path} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent data-[status=active]:bg-primary-soft data-[status=active]:text-primary">
                            <Icon name={i.icon} className="size-4" />
                            {i.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <button
                onClick={() => setPaletteOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border-strong sm:max-w-sm"
                aria-label="Open global search"
              >
                <Icons.Search className="size-4 shrink-0" aria-hidden />
                <span className="truncate">Search students, classes, modules…</span>
                <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 text-[10px] sm:block">⌘K</kbd>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <SchoolYearSelectors />
              <NotificationsMenu />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)} aria-label="Help and keyboard shortcuts">
                    <Icons.CircleQuestionMark className="size-5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Help & shortcuts</TooltipContent>
              </Tooltip>
              <ProfileMenu />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border px-4 py-2 text-xs lg:px-6">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <Link to="/app" className="hover:text-foreground">
                Home
              </Link>
              {current && current.path !== "/app" && (
                <>
                  <Icons.ChevronRight className="size-3.5" aria-hidden />
                  <span className="truncate font-medium text-foreground">{current.label}</span>
                </>
              )}
            </nav>
            <span className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-2 rounded-full", SYSTEM_STATUS.state === "operational" ? "bg-success" : "bg-warning")} />
                {SYSTEM_STATUS.message}
              </span>
              <span className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
                <Icons.RefreshCw className="size-3" aria-hidden /> Synced {SYSTEM_STATUS.lastSync}
              </span>
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <Switch
                  checked={state.offline}
                  onCheckedChange={(v) => {
                    state.setOffline(v);
                    toast[v ? "warning" : "success"](v ? "Offline mode on — changes will queue for sync" : "Back online — queued changes synced");
                  }}
                  aria-label="Toggle offline mode"
                />
                {state.offline ? "Offline" : "Online"}
              </label>
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:px-6 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden" aria-label="Primary">
          {mobileItems.map((i) => (
            <Link
              key={i!.path}
              to={i!.path}
              activeOptions={{ exact: i!.path === "/app" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground data-[status=active]:text-primary"
            >
              <Icon name={i!.icon} className="size-5" />
              <span className="truncate px-1">{i!.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={state.role} />
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts & help</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {[
              ["⌘ K / Ctrl K", "Open the command palette"],
              ["G then D", "Go to dashboard"],
              ["G then A", "Go to attendance"],
              ["N", "New assignment"],
              ["?", "Open this dialog"],
              ["Esc", "Close dialogs and drawers"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-4 rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">{v}</span>
                <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs font-medium">{k}</kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchoolYearSelectors() {
  const { school, year, setSchoolId, setYearId, locale, setLocale } = useAppState();
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[190px]">
            <span className="grid size-5 shrink-0 place-items-center rounded bg-primary-soft text-[10px] font-bold text-primary">
              {school.logoInitials}
            </span>
            <span className="truncate">{school.name}</span>
            <Icons.ChevronDown className="size-3.5 shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Current school</DropdownMenuLabel>
          {SCHOOLS.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => setSchoolId(s.id)} className="gap-2">
              <span className="grid size-6 place-items-center rounded bg-muted text-[10px] font-bold">{s.logoInitials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{s.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{s.board} · {s.city}</span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Campuses</DropdownMenuLabel>
          {school.campuses.map((c) => (
            <DropdownMenuItem key={c.id} className="text-sm">
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {year.label}
            <Icons.ChevronDown className="size-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Academic year</DropdownMenuLabel>
          {ACADEMIC_YEARS.map((y) => (
            <DropdownMenuItem key={y.id} onClick={() => setYearId(y.id)}>
              {y.label}
              <Badge variant="secondary" className="ml-auto text-[10px] capitalize">{y.status}</Badge>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Language</DropdownMenuLabel>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem key={l.id} onClick={() => setLocale(l.id)}>
              {l.native}
              {locale === l.id ? <Icons.Check className="ml-auto size-4" aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NotificationsMenu() {
  const { role, isRead, markRead, markAllRead, unreadCount } = useAppState();
  const items = NOTIFICATIONS.filter((n) => n.roles.includes(role));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unreadCount} unread`}>
          <Icons.Bell className="size-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-danger-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className="flex w-full gap-2.5 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-muted"
            >
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  n.severity === "critical" ? "bg-danger" : n.severity === "warning" ? "bg-warning" : n.severity === "success" ? "bg-success" : "bg-primary",
                  isRead(n.id) && "opacity-25",
                )}
              />
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", !isRead(n.id) && "font-semibold")}>{n.title}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{n.createdAt}</span>
              </span>
            </button>
          ))}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/app/notifications">Open notification centre</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { role } = useAppState();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account and role menu">
          <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
            <Icons.UserRound className="size-4" aria-hidden />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[120px] truncate text-xs font-semibold leading-tight">Account</span>
            <span className="block text-[10px] leading-tight text-muted-foreground">{ROLE_LABEL[role]}</span>
          </span>
          <Icons.ChevronDown className="size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <p className="text-sm">Account</p>
          <p className="text-xs font-normal text-muted-foreground">Authenticated workspace access</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          <p className="text-xs font-normal text-muted-foreground">Current role</p>
          <p className="text-sm font-medium">{ROLE_LABEL[role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings">Settings</Link>
        </DropdownMenuItem>
        {role === "owner" ? (
          <DropdownMenuItem asChild>
            <Link to="/app/subscription">Subscription</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/" onClick={() => localStorage.removeItem("shwai.demo.state")}>
            Log out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: Role;
}) {
  const groups = navForRole(role);
  const [query, setQuery] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search and command palette</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search modules, students, actions…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.label} heading={g.label}>
                {g.items.map((i) => (
                  <CommandItem key={i.path} value={`${i.label} ${i.description}`} asChild>
                    <Link to={i.path} onClick={() => onOpenChange(false)} className="flex items-center gap-2">
                      <Icon name={i.icon} className="size-4" />
                      <span>{i.label}</span>
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
