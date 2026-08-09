import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Users,
  CalendarCheck,
  Megaphone,
  X
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listEvents, createEvent, deleteEvent } from "@/rpc/calendar";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { role, schoolId } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const isPrincipal = role === "principal";

  const { data: events = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["calendar-events", schoolId, role],
    queryFn: () => listEvents({ data: { schoolId, role } }),
    enabled: Boolean(schoolId),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent({ data: { actorRole: role, eventId } }),
    onSuccess: () => {
      toast.success("Event deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete event"),
  });

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Overview</p>
          <h1 className="text-3xl font-extrabold tracking-tight">School Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            View national holidays, exams, parent-teacher meetings, and targeted academic schedules.
          </p>
        </div>
        {isPrincipal && (
          <CreateEventDialog schoolId={schoolId} />
        )}
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Events Agenda / List View */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <CalendarCheck className="size-5 text-primary" /> Upcoming Events
              </CardTitle>
              <CardDescription>Agenda list for the current school semester.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 px-3">
              {isLoading ? (
                <div className="py-6 text-center"><Loader2 className="size-5 animate-spin mx-auto text-primary" /></div>
              ) : isError ? (
                <div className="text-xs text-danger py-4 text-center">Failed to load events</div>
              ) : events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No upcoming events scheduled.</p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {events.map((e: any) => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors flex items-start justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider rounded-md mb-1 capitalize">
                          {e.event_type}
                        </Badge>
                        <h4 className="font-bold text-sm truncate">{e.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(e.event_date)}</p>
                      </div>

                      {isPrincipal && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-danger/10 hover:text-danger relative z-10"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            deleteMutation.mutate(e.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar View Container */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <CalendarDays className="size-5 text-primary" /> Monthly Overview
              </CardTitle>
              <CardDescription>Interactive school calendar events visual map.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Clean Monthly Days Map */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs border rounded-xl p-4 bg-muted/20">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider py-1">{d}</div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const dayNum = i + 1;
                  // Map matching events dynamically
                  const dayEvents = events.filter((e: any) => new Date(e.event_date).getDate() === dayNum);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square rounded-lg border bg-card p-1.5 flex flex-col justify-between items-start transition-colors relative",
                        dayEvents.length > 0 && "border-primary/40 bg-primary-soft/10"
                      )}
                    >
                      <span className="font-bold text-[11px] text-muted-foreground">{dayNum}</span>
                      {dayEvents.length > 0 && (
                        <div className="w-full flex flex-col gap-0.5 mt-1 overflow-hidden">
                          {dayEvents.slice(0, 2).map((ev: any) => (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="text-[8px] truncate bg-primary text-white rounded px-1 py-0.5 font-semibold cursor-pointer hover:bg-primary/95"
                            >
                              {ev.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] uppercase rounded-full">
                  {selectedEvent.event_type}
                </Badge>
                <Badge variant="outline" className="text-[10px] rounded-full">
                  Target: {selectedEvent.target_audience}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold mt-2">{selectedEvent.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Scheduled Date: {formatDate(selectedEvent.event_date)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              {selectedEvent.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
              )}
              {(selectedEvent.start_time || selectedEvent.end_time) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5" /> Timing: {selectedEvent.start_time || "—"} to {selectedEvent.end_time || "—"}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedEvent(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <FloatingAI />
    </div>
  );
}

function CreateEventDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState("event");
  const [targetAudience, setTargetAudience] = useState("all");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createEvent({
        data: {
          schoolId,
          actorRole: "principal",
          title,
          description: description.trim() || undefined,
          eventDate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          eventType,
          targetAudience,
          targetClassId: targetClassId || undefined,
          targetRole: targetRole || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Calendar event created");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setEventDate("");
      setStartTime("");
      setEndTime("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create event"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Create event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle>Add Calendar Event</DialogTitle>
          <DialogDescription>Schedule and publish a school-wide or targeted calendar event.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !eventDate) {
              toast.error("Please fill in required fields.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Event Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Sports Meet" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event details and instructions…" className="min-h-20" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Event Date</Label>
              <Input id="ev-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-type">Event Type</Label>
              <select
                id="ev-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="event">General Event</option>
                <option value="holiday">School Holiday</option>
                <option value="exam">Exam Schedule</option>
                <option value="ptm">Parent-Teacher Meeting</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Start Time</Label>
              <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">End Time</Label>
              <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-audience">Target Audience</Label>
            <select
              id="ev-audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All School</option>
              <option value="role">Specific Role Only</option>
              <option value="class">Specific Class Room Only</option>
            </select>
          </div>

          {targetAudience === "class" && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-target-class">Target Class</Label>
              <select
                id="ev-target-class"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Select class room...</option>
                {CLASS_SECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetAudience === "role" && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-target-role">Target Role</Label>
              <select
                id="ev-target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Select target role...</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="parent">Parents</option>
              </select>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />} Schedule Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
