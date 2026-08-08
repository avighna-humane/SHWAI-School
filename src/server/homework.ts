/**
 * SERVER-ONLY homework functions. See auth-context.ts for the identity model.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "./supabase-admin";
import { DEMO_SCHOOL_ID, ForbiddenError, NotFoundError, assertTeacherOwnsClass, resolveActor, studentsInClasses } from "./auth-context";
import { getClassSection } from "./auth-context";
import { uploadAttachment } from "./files";

const actorSchema = { role: z.string(), actorId: z.string() };

const attachmentInputSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  base64Data: z.string(),
});

export const listHomework = createServerFn({ method: "POST" })
  .validator(z.object(actorSchema))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();

    let query = supabase
      .from("homework")
      .select("*, homework_attachments(*)")
      .eq("school_id", DEMO_SCHOOL_ID)
      .is("deleted_at", null)
      .order("due_at", { ascending: true });

    if (actor.role === "teacher") {
      query = query.eq("teacher_id", actor.id);
    } else if (actor.role === "student") {
      query = query.eq("class_id", actor.classId!).eq("status", "published");
    }
    // Principal sees all homework school-wide (read-only oversight).

    const { data: homework, error } = await query;
    if (error) throw new Error(error.message);

    if (actor.role === "student") {
      const ids = (homework ?? []).map((h: any) => h.id);
      const [{ data: views }, { data: submissions }] = await Promise.all([
        supabase.from("homework_views").select("homework_id, last_viewed_at").eq("student_id", actor.id).in("homework_id", ids.length ? ids : ["-"]),
        supabase.from("submissions").select("homework_id, status, submitted_at, marks").eq("student_id", actor.id).in("homework_id", ids.length ? ids : ["-"]),
      ]);
      const viewedIds = new Set((views ?? []).map((v: any) => v.homework_id));
      const subMap = new Map((submissions ?? []).map((s: any) => [s.homework_id, s]));
      return (homework ?? []).map((h: any) => ({ ...h, viewedByMe: viewedIds.has(h.id), mySubmission: subMap.get(h.id) ?? null }));
    }

    if (actor.role === "teacher") {
      const ids = (homework ?? []).map((h: any) => h.id);
      const [{ data: views }, { data: submissions }] = await Promise.all([
        supabase.from("homework_views").select("homework_id").in("homework_id", ids.length ? ids : ["-"]),
        supabase.from("submissions").select("homework_id").in("homework_id", ids.length ? ids : ["-"]),
      ]);
      const viewCounts = new Map<string, number>();
      for (const v of views ?? []) viewCounts.set((v as any).homework_id, (viewCounts.get((v as any).homework_id) ?? 0) + 1);
      const subCounts = new Map<string, number>();
      for (const s of submissions ?? []) subCounts.set((s as any).homework_id, (subCounts.get((s as any).homework_id) ?? 0) + 1);
      return (homework ?? []).map((h: any) => {
        const roster = studentsInClasses([h.class_id]).length;
        return { ...h, assignedCount: roster, viewedCount: viewCounts.get(h.id) ?? 0, submittedCount: subCounts.get(h.id) ?? 0 };
      });
    }

    return homework ?? [];
  });

export const getHomework = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, homeworkId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();
    const { data: homework, error } = await supabase
      .from("homework")
      .select("*, homework_attachments(*)")
      .eq("id", data.homeworkId)
      .is("deleted_at", null)
      .single();
    if (error || !homework) throw new NotFoundError("Homework not found.");

    if (actor.role === "student" && homework.class_id !== actor.classId) {
      throw new ForbiddenError("This homework is not assigned to your class.");
    }
    if (actor.role === "teacher" && homework.teacher_id !== actor.id) {
      throw new ForbiddenError("You did not create this homework.");
    }
    return homework;
  });

export const createHomework = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ...actorSchema,
      classId: z.string(),
      subject: z.string().min(1),
      title: z.string().min(1).max(200),
      description: z.string().max(5000).default(""),
      dueAt: z.string(), // ISO
      totalMarks: z.number().int().min(1).max(1000).default(100),
      allowResubmission: z.boolean().default(false),
      status: z.enum(["draft", "published"]).default("published"),
      attachments: z.array(attachmentInputSchema).max(5).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    assertTeacherOwnsClass(actor, data.classId);
    const cls = getClassSection(data.classId);
    if (!cls) throw new NotFoundError("Class not found.");

    const supabase = supabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("homework")
      .insert({
        school_id: DEMO_SCHOOL_ID,
        teacher_id: actor.id,
        teacher_name: actor.name,
        subject: data.subject,
        class_id: data.classId,
        class_label: cls.label,
        title: data.title,
        description: data.description,
        due_at: data.dueAt,
        total_marks: data.totalMarks,
        allow_resubmission: data.allowResubmission,
        status: data.status,
      })
      .select()
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Failed to create homework.");

    for (const file of data.attachments) {
      const meta = await uploadAttachment({ prefix: `homework/${inserted.id}`, fileName: file.fileName, mimeType: file.mimeType, base64Data: file.base64Data });
      await supabase.from("homework_attachments").insert({
        homework_id: inserted.id,
        file_path: meta.filePath,
        file_name: meta.fileName,
        size_bytes: meta.sizeBytes,
        mime_type: meta.mimeType,
      });
    }

    return { ok: true, id: inserted.id as string };
  });

export const recordHomeworkView = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, homeworkId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "student") return { ok: true };
    const supabase = supabaseAdmin();

    const { data: homework } = await supabase.from("homework").select("class_id").eq("id", data.homeworkId).single();
    if (!homework || homework.class_id !== actor.classId) throw new ForbiddenError("This homework is not assigned to your class.");

    const { data: existing } = await supabase
      .from("homework_views")
      .select("id, view_count")
      .eq("homework_id", data.homeworkId)
      .eq("student_id", actor.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("homework_views")
        .update({ last_viewed_at: new Date().toISOString(), view_count: existing.view_count + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("homework_views").insert({ homework_id: data.homeworkId, student_id: actor.id });
    }
    return { ok: true };
  });

export const getHomeworkActivity = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, homeworkId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();
    const { data: homework } = await supabase.from("homework").select("*").eq("id", data.homeworkId).single();
    if (!homework) throw new NotFoundError("Homework not found.");
    if (actor.role === "teacher" && homework.teacher_id !== actor.id) throw new ForbiddenError("You did not create this homework.");
    if (actor.role === "student") throw new ForbiddenError("Students cannot view class-wide activity.");

    const roster = studentsInClasses([homework.class_id]);
    const [{ data: views }, { data: submissions }] = await Promise.all([
      supabase.from("homework_views").select("student_id, first_viewed_at, last_viewed_at, view_count").eq("homework_id", data.homeworkId),
      supabase.from("submissions").select("student_id, status, submitted_at, marks, feedback").eq("homework_id", data.homeworkId),
    ]);
    const viewMap = new Map((views ?? []).map((v: any) => [v.student_id, v]));
    const subMap = new Map((submissions ?? []).map((s: any) => [s.student_id, s]));

    const rows = roster.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      view: viewMap.get(s.id) ?? null,
      submission: subMap.get(s.id) ?? null,
    }));

    return {
      total: rows.length,
      viewed: rows.filter((r) => r.view).length,
      submitted: rows.filter((r) => r.submission).length,
      late: rows.filter((r) => r.submission?.status === "late").length,
      rows,
    };
  });
