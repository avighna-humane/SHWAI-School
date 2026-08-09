import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Loader2,
  Users,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listCalendarEvents, createCalendarEvent, deleteCalendarEvent } from "@/rpc/calendar";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  subMonths,
} from "date-fns";

export const Route = createFileRoute("/app/calendar")({ component: SchoolCalendarPage });

const TYPE_COLORS: Record<string, string> = {
  holiday: "bg-danger-soft text-danger border-danger/20",
  exam: "bg-warning-soft text-warning border-warning/20",
  ptm: "bg-info-soft text-info border-info/20",
  event: "bg-primary-soft text-primary border-primary/20",
  sports: "bg-success-soft text-success border-success/20",
  function: "bg-ai-soft text-ai border-ai/20",
  "assignment-due": "bg-muted-soft text-muted-foreground border-muted/20",
  "exam-due": "bg-warning-soft text-warning border-warning/20",
};

function SchoolCalendarPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Queries
  const calendarQuery = useQuery({
    queryKey: ["calendar-events", actorParams],
    queryFn: () => listCalendarEvents({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  // Create event mutation
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [type, setType] = useState("event");
  const [audience, setAudience] = useState<string>("student");
  const [selectedClassId, setSelectedClassId] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createCalendarEvent({
        data: {
          role,
          actorId: actorParams?.actorId,
          title,
          description,
          date: dateStr,
          type,
          targetAudience: audience === "all" ? ["student", "teacher", "parent"] : [audience as any],
          classId: selectedClassId || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Calendar event created successfully");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setDateStr("");
      setSelectedClassId("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create event"),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      deleteCalendarEvent({ data: { role, actorId: actorParams?.actorId, eventId } }),
    onSuccess: () => {
      toast.success("Event deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete event"),
  });

  const events = calendarQuery.data ?? [];

  // Month navigation helpers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  if (!actorParams) {
    return (
      <EmptyState
        title="Access Denied"
        description="Please select an active role inside Settings to open the school calendar."
        icon={<CalendarDays className="size-6" />}
      />
    );
  }

  const isStaff = role === "principal" || role === "teacher";

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Schedule
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">School Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Schedule of half-yearly exams, sports meets, PTM meetings, and general gazetted
            holidays.
          </p>
        </div>
        {isStaff && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Calendar Event</DialogTitle>
                <DialogDescription>
                  Create a general event or assign it to a targeted student class.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!title || !dateStr) return;
                  createMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="evt-title">Event Title</Label>
                  <Input
                    id="evt-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sports Day Meet"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="evt-desc">Description</Label>
                  <Input
                    id="evt-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Football finals & prize distributions"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-date">Date</Label>
                    <Input
                      id="evt-date"
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-type">Type</Label>
                    <select
                      id="evt-type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="event">General Event</option>
                      <option value="holiday">Holiday</option>
                      <option value="exam">Exam</option>
                      <option value="ptm">PTM Meeting</option>
                      <option value="sports">Sports</option>
                      <option value="function">School Function</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-audience">Audience</Label>
                    <select
                      id="evt-audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="student">Students</option>
                      <option value="teacher">Teachers / Staff</option>
                      <option value="parent">Parents</option>
                      <option value="all">All School</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="evt-class">Class (Optional)</Label>
                    <select
                      id="evt-class"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">No specific class</option>
                      {CLASS_SECTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createMutation.isPending || !title || !dateStr}>
                    {createMutation.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
                    Add Event
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Month View Visual Grid */}
        <div className="lg:col-span-2 surface-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-lg font-bold flex items-center gap-1.5 text-primary">
              <CalendarCheck className="size-5" /> {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1.5">
              <Button variant="outline" size="icon" className="size-8" onClick={handlePrevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={handleNextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Pad the first week days */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="aspect-square rounded-xl bg-muted/10 opacity-30 border"
              />
            ))}

            {daysInMonth.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(dateStr) ?? [];
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-xl p-2 border flex flex-col justify-between items-start hover:border-primary/40 hover:bg-muted/10 transition-all text-left",
                    isToday ? "border-primary bg-primary-soft/10" : "bg-card",
                  )}
                >
                  <span className={cn("text-xs font-bold", isToday && "text-primary")}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full mt-1.5">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <span
                        key={evt.id}
                        className="text-[9px] truncate font-semibold block px-1 py-0.5 rounded bg-muted/60 border truncate max-w-full"
                      >
                        {evt.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[8px] text-muted-foreground font-extrabold pl-1 block">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* List formats & details */}
        <div className="lg:col-span-1 surface-panel p-5 space-y-4 flex flex-col justify-between h-full">
          <div>
            <h2 className="text-lg font-bold pb-2 border-b flex items-center gap-1.5 text-primary">
              <Sparkles className="size-5 text-warning fill-warning/20" /> Scheduled Events
            </h2>
            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
              {calendarQuery.isLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No upcoming events scheduled.
                </p>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 border rounded-xl bg-card space-y-2 relative group hover:border-border-strong transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold rounded-full capitalize",
                          TYPE_COLORS[evt.type],
                        )}
                      >
                        {evt.type}
                      </Badge>
                      {isStaff &&
                        (role === "principal" || evt.createdBy === actorParams?.actorId) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMutation.mutate(evt.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {evt.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <Clock className="size-3.5" /> {formatDate(evt.date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <FloatingAI />
    </div>
  );
}
