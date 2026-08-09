// SERVER-ONLY. Calendar Events
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "./supabase-admin";
import {
  resolveActor,
  assertPrincipal,
  ForbiddenError,
  NotFoundError,
  type ActorRole,
} from "./auth-context";
import type { Role } from "@/types";

export interface CalendarEventData {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  type:
    "holiday" | "exam" | "ptm" | "event" | "sports" | "function" | "assignment-due" | "exam-due";
  targetAudience: Role[];
  classId?: string;
  createdBy: string;
  createdAt: string;
}

/** Fetch calendar events scoped to active school and target audience */
export const listCalendarEvents = createServerFn({ method: "GET" })
  .validator((data: { role: string; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    const { data: rows, error } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("school_id", actor.schoolId)
      .order("date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const events = (rows ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description || "",
      date: row.date,
      endDate: row.end_date || undefined,
      startTime: row.start_time || undefined,
      endTime: row.end_time || undefined,
      type: row.type as any,
      targetAudience: (row.target_audience ?? []) as Role[],
      classId: row.class_id || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
    })) as CalendarEventData[];

    // Strict multi-tenant isolation & audience filters
    return events.filter((evt) => {
      // Principal sees everything in their school
      if (actor.role === "principal") return true;

      // Filter by target role audience
      if (evt.targetAudience.length > 0 && !evt.targetAudience.includes(actor.role as ActorRole)) {
        return false;
      }

      // Filter by student class targeting if applicable
      if (actor.role === "student" && evt.classId && evt.classId !== actor.classId) {
        return false;
      }

      return true;
    });
  });

/** Create calendar event */
export const createCalendarEvent = createServerFn({ method: "POST" })
  .validator(
    (data: {
      role: string;
      actorId?: string;
      title: string;
      description?: string;
      date: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      type: string;
      targetAudience: Role[];
      classId?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });
    if (actor.role !== "principal" && actor.role !== "teacher") {
      throw new ForbiddenError("Only authorized staff can add calendar events.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        school_id: actor.schoolId,
        title: data.title,
        description: data.description || "",
        date: data.date,
        end_date: data.endDate || null,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        type: data.type,
        target_audience: data.targetAudience,
        class_id: data.classId || null,
        created_by: actor.id,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to create calendar event.");
    }

    return { id: inserted.id as string };
  });

/** Delete calendar event */
export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .validator((data: { role: string; actorId?: string; eventId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    // Check if the event exists and belongs to the caller's school
    const { data: event, error: fetchErr } = await supabaseAdmin
      .from("calendar_events")
      .select("school_id, created_by")
      .eq("id", data.eventId)
      .single();

    if (fetchErr || !event) {
      throw new NotFoundError("Calendar event not found.");
    }

    if (event.school_id !== actor.schoolId) {
      throw new ForbiddenError("Cannot manage events of another school.");
    }

    if (actor.role !== "principal" && event.created_by !== actor.id) {
      throw new ForbiddenError("You can only delete events that you created.");
    }

    const { error } = await supabaseAdmin.from("calendar_events").delete().eq("id", data.eventId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
