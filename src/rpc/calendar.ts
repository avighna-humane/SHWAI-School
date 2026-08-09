// SERVER-ONLY. Basic school calendar event RPC stubs.
import { createServerFn } from "@tanstack/react-start";
import { resolveActor, ForbiddenError, NotFoundError } from "./auth-context";

export const listEvents = createServerFn({ method: "GET" })
  .validator((data: { schoolId: string; role: string; classId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { schoolId, role, classId } = data;

    // Fetch school events
    const { data: events, error } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("school_id", schoolId)
      .order("event_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Filter by target audience and targeted class or role (secured server-side!)
    return (events || []).filter((e) => {
      if (e.target_audience === "all") return true;
      if (e.target_audience === "role" && e.target_role === role) return true;
      if (e.target_audience === "class" && e.target_class_id === classId) return true;
      return false;
    });
  });

export const createEvent = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { schoolId, actorRole, title, description, eventDate, startTime, endTime, eventType, targetAudience, targetClassId, targetRole } = data;

    if (actorRole !== "principal" && actorRole !== "admin") {
      throw new ForbiddenError("Only school administrators can create calendar events.");
    }

    if (!title || !eventDate || !schoolId) {
      throw new Error("Missing required event details.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        school_id: schoolId,
        title,
        description: description || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        event_type: eventType || "event",
        target_audience: targetAudience || "all",
        target_class_id: targetClassId || null,
        target_role: targetRole || null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message || "Failed to create calendar event.");
    }

    return inserted;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .validator((data: { actorRole: string; eventId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { actorRole, eventId } = data;

    if (actorRole !== "principal" && actorRole !== "admin") {
      throw new ForbiddenError("Only school administrators can delete calendar events.");
    }

    const { error } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      throw new Error("Failed to delete event.");
    }

    return { ok: true };
  });
