/**
 * SERVER-ONLY notice functions. See auth-context.ts for the identity model.
 * Recipient resolution (audience -> concrete ids) is computed dynamically
 * from the live mock rosters, not snapshotted at creation time.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "./supabase-admin";
import {
  DEMO_SCHOOL_ID,
  ForbiddenError,
  NotFoundError,
  assertPrincipal,
  assertTeacher,
  resolveActor,
  studentsInClasses,
} from "./auth-context";
import { TEACHERS } from "@/data/mock/people";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { uploadAttachment } from "./files";

const actorSchema = { role: z.string(), actorId: z.string() };

const audienceSchema = z.object({
  audienceType: z.enum(["all_students", "class", "all_teachers", "specific_teachers", "specific_students", "school"]),
  audienceClassIds: z.array(z.string()).default([]),
  audienceTeacherIds: z.array(z.string()).default([]),
  audienceStudentIds: z.array(z.string()).default([]),
});

const attachmentInputSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  base64Data: z.string(),
});

/** Does this notice's audience include the given viewer? */
function noticeIncludesViewer(
  notice: { audience_type: string; audience_class_ids: string[]; audience_teacher_ids: string[]; audience_student_ids: string[]; author_role: string },
  viewer: { role: "student" | "teacher" | "principal"; id: string; classId?: string; classIds?: string[] },
): boolean {
  if (viewer.role === "principal") return true;

  if (viewer.role === "teacher") {
    if (notice.author_role === "principal") {
      return (
        notice.audience_type === "all_teachers" ||
        (notice.audience_type === "specific_teachers" && notice.audience_teacher_ids.includes(viewer.id)) ||
        notice.audience_type === "school"
      );
    }
    // Teacher-authored notices are not addressed to other teachers.
    return false;
  }

  // viewer.role === "student"
  if (notice.audience_type === "school") return true;
  if (notice.audience_type === "all_students") return true;
  if (notice.audience_type === "class") return !!viewer.classId && notice.audience_class_ids.includes(viewer.classId);
  if (notice.audience_type === "specific_students") return notice.audience_student_ids.includes(viewer.id);
  return false;
}

function resolveRecipientCount(notice: {
  audience_type: string;
  audience_class_ids: string[];
  audience_teacher_ids: string[];
  audience_student_ids: string[];
}): { total: number; label: string } {
  switch (notice.audience_type) {
    case "school":
      return { total: TEACHERS.length + CLASS_SECTIONS.length, label: "Entire school" };
    case "all_students": {
      const classIds = CLASS_SECTIONS.map((c) => c.id);
      return { total: studentsInClasses(classIds).length, label: "All students" };
    }
    case "class":
      return { total: studentsInClasses(notice.audience_class_ids).length, label: "Selected classes" };
    case "specific_students":
      return { total: notice.audience_student_ids.length, label: "Selected students" };
    case "all_teachers":
      return { total: TEACHERS.length, label: "All teachers" };
    case "specific_teachers":
      return { total: notice.audience_teacher_ids.length, label: "Selected teachers" };
    default:
      return { total: 0, label: "" };
  }
}

export const listNotices = createServerFn({ method: "POST" })
  .validator(z.object(actorSchema))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();

    const { data: notices, error } = await supabase
      .from("notices")
      .select("*, notice_attachments(*)")
      .eq("school_id", DEMO_SCHOOL_ID)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const relevant = (notices ?? []).filter((n: any) =>
      actor.role === "teacher" || actor.role === "principal"
        ? // Staff see everything they authored, plus anything addressed to them.
          n.author_id === actor.id || noticeIncludesViewer(n, actor)
        : noticeIncludesViewer(n, actor),
    );

    if (actor.role === "student") {
      const { data: views } = await supabase
        .from("notice_views")
        .select("notice_id, last_viewed_at")
        .eq("viewer_type", "student")
        .eq("viewer_id", actor.id);
      const viewedIds = new Set((views ?? []).map((v: any) => v.notice_id));
      return relevant.map((n: any) => ({ ...n, viewedByMe: viewedIds.has(n.id) }));
    }

    return relevant.map((n: any) => ({ ...n, recipients: resolveRecipientCount(n) }));
  });

export const createNotice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ...actorSchema,
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(5000),
      ...audienceSchema.shape,
      attachments: z.array(attachmentInputSchema).max(5).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "teacher" && actor.role !== "principal") {
      throw new ForbiddenError("Only teachers and the principal can create notices.");
    }

    if (actor.role === "teacher") {
      // Teachers may only address their own classes and only student audiences.
      if (!["class", "all_students", "specific_students"].includes(data.audienceType)) {
        throw new ForbiddenError("Teachers can only address students.");
      }
      if (data.audienceType === "class") {
        for (const classId of data.audienceClassIds) {
          if (!actor.classIds.includes(classId)) throw new ForbiddenError("You can only post to your own classes.");
        }
      }
      if (data.audienceType === "all_students") {
        // Restrict "all students" for a teacher to their own classes' students.
        data.audienceType = "class";
        data.audienceClassIds = actor.classIds;
      }
    }

    if (actor.role === "principal") {
      if (!["all_teachers", "specific_teachers", "all_students", "class", "specific_students", "school"].includes(data.audienceType)) {
        throw new ForbiddenError("Invalid audience for a principal notice.");
      }
    }

    const supabase = supabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("notices")
      .insert({
        school_id: DEMO_SCHOOL_ID,
        author_id: actor.id,
        author_name: actor.name,
        author_role: actor.role,
        title: data.title,
        body: data.body,
        audience_type: data.audienceType,
        audience_class_ids: data.audienceClassIds,
        audience_teacher_ids: data.audienceTeacherIds,
        audience_student_ids: data.audienceStudentIds,
      })
      .select()
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Failed to create notice.");

    for (const file of data.attachments) {
      const meta = await uploadAttachment({ prefix: `notices/${inserted.id}`, fileName: file.fileName, mimeType: file.mimeType, base64Data: file.base64Data });
      await supabase.from("notice_attachments").insert({
        notice_id: inserted.id,
        file_path: meta.filePath,
        file_name: meta.fileName,
        size_bytes: meta.sizeBytes,
        mime_type: meta.mimeType,
      });
    }

    return { ok: true, id: inserted.id as string };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, noticeId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();
    const { data: notice } = await supabase.from("notices").select("author_id").eq("id", data.noticeId).single();
    if (!notice) throw new NotFoundError("Notice not found.");
    if (notice.author_id !== actor.id) throw new ForbiddenError("You can only delete your own notices.");
    const { error } = await supabase.from("notices").update({ deleted_at: new Date().toISOString() }).eq("id", data.noticeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordNoticeView = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, noticeId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "student" && actor.role !== "teacher") {
      return { ok: true }; // Principal viewing their own audience doesn't need tracking.
    }
    const supabase = supabaseAdmin();

    const { data: existing } = await supabase
      .from("notice_views")
      .select("id, view_count")
      .eq("notice_id", data.noticeId)
      .eq("viewer_type", actor.role)
      .eq("viewer_id", actor.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("notice_views")
        .update({ last_viewed_at: new Date().toISOString(), view_count: existing.view_count + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("notice_views").insert({ notice_id: data.noticeId, viewer_type: actor.role, viewer_id: actor.id });
    }
    return { ok: true };
  });

export const getNoticeActivity = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, noticeId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();

    const { data: notice } = await supabase.from("notices").select("*").eq("id", data.noticeId).single();
    if (!notice) throw new NotFoundError("Notice not found.");
    if (notice.author_id !== actor.id && actor.role !== "principal") {
      throw new ForbiddenError("Only the author (or the principal) can view notice activity.");
    }

    const isStaffAudience = notice.audience_type === "all_teachers" || notice.audience_type === "specific_teachers" || notice.audience_type === "school";
    const viewerType = isStaffAudience && notice.author_role === "principal" ? "teacher" : "student";

    let recipients: { id: string; name: string; classLabel?: string }[] = [];
    if (viewerType === "teacher") {
      const ids =
        notice.audience_type === "specific_teachers" ? notice.audience_teacher_ids : TEACHERS.map((t) => t.id);
      recipients = TEACHERS.filter((t) => ids.includes(t.id)).map((t) => ({ id: t.id, name: t.name }));
    } else {
      const classIds =
        notice.audience_type === "class"
          ? notice.audience_class_ids
          : notice.audience_type === "all_students" || notice.audience_type === "school"
            ? CLASS_SECTIONS.map((c) => c.id)
            : [];
      const students =
        notice.audience_type === "specific_students"
          ? studentsInClasses(CLASS_SECTIONS.map((c) => c.id)).filter((s) => notice.audience_student_ids.includes(s.id))
          : studentsInClasses(classIds);
      recipients = students.map((s) => ({ id: s.id, name: s.name, classLabel: CLASS_SECTIONS.find((c) => c.id === s.classId)?.label }));
    }

    const { data: views } = await supabase
      .from("notice_views")
      .select("viewer_id, first_viewed_at, last_viewed_at, view_count")
      .eq("notice_id", data.noticeId)
      .eq("viewer_type", viewerType);
    const viewMap = new Map((views ?? []).map((v: any) => [v.viewer_id, v]));

    const rows = recipients.map((r) => ({ ...r, view: viewMap.get(r.id) ?? null }));
    return {
      total: rows.length,
      viewed: rows.filter((r) => r.view).length,
      rows,
    };
  });
