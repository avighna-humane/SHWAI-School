// SERVER-ONLY. Notices / announcements — student+teacher facing (created by
// teachers/principal) and principal→teacher "staff notices" (same table,
// filtered by audience_type). See auth-context.ts for the identity model.
import { createServerFn } from "@tanstack/react-start";
import type { Notice, NoticeActivity, NoticeAudienceType } from "@/types";
import { STUDENTS, TEACHERS } from "@/data/mock/people";
import {
  type Actor,
  type ActorRole,
  ForbiddenError,
  NotFoundError,
  SCHOOL_ID,
  assertTeacherOwnsClass,
  resolveActor,
} from "./auth-context";

interface NoticeRow {
  id: string;
  school_id: string;
  author_id: string;
  author_name: string;
  author_role: "teacher" | "principal";
  title: string;
  body: string;
  audience_type: NoticeAudienceType;
  audience_class_ids: string[];
  audience_teacher_ids: string[];
  audience_student_ids: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  notice_attachments?: { id: string; file_path: string; file_name: string; size_bytes: number; mime_type: string }[];
}

function mapNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    schoolId: row.school_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    title: row.title,
    body: row.body,
    audienceType: row.audience_type,
    audienceClassIds: row.audience_class_ids ?? [],
    audienceTeacherIds: row.audience_teacher_ids ?? [],
    audienceStudentIds: row.audience_student_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: (row.notice_attachments ?? []).map((a) => ({
      id: a.id,
      filePath: a.file_path,
      fileName: a.file_name,
      sizeBytes: a.size_bytes,
      mimeType: a.mime_type,
    })),
  };
}

const STUDENT_AUDIENCES: NoticeAudienceType[] = ["all_students", "class", "specific_students", "parents", "school"];
const TEACHER_AUDIENCES: NoticeAudienceType[] = ["all_teachers", "specific_teachers"];

/** Resolves a notice's concrete recipient list dynamically from current mock rosters. */
function resolveRecipients(notice: Pick<NoticeRow, "audience_type" | "audience_class_ids" | "audience_teacher_ids" | "audience_student_ids">) {
  switch (notice.audience_type) {
    case "all_students":
    case "school":
      return STUDENTS.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name, type: "student" as const }));
    case "class":
      return STUDENTS.filter((s) => s.status === "active" && notice.audience_class_ids.includes(s.classId)).map((s) => ({
        id: s.id,
        name: s.name,
        type: "student" as const,
      }));
    case "specific_students":
      return STUDENTS.filter((s) => notice.audience_student_ids.includes(s.id)).map((s) => ({ id: s.id, name: s.name, type: "student" as const }));
    case "all_teachers":
      return TEACHERS.map((t) => ({ id: t.id, name: t.name, type: "teacher" as const }));
    case "specific_teachers":
      return TEACHERS.filter((t) => notice.audience_teacher_ids.includes(t.id)).map((t) => ({ id: t.id, name: t.name, type: "teacher" as const }));
    case "parents":
      return [];
    default:
      return [];
  }
}

function actorIsRecipient(actor: Actor, notice: NoticeRow): boolean {
  if (actor.role === "student") {
    return resolveRecipients(notice).some((r) => r.type === "student" && r.id === actor.id);
  }
  if (actor.role === "teacher") {
    // Teachers see all-teacher/specific-teacher notices, plus any notice targeted at their own classes.
    if (notice.audience_type === "all_teachers") return true;
    if (notice.audience_type === "specific_teachers") return notice.audience_teacher_ids.includes(actor.id);
    if (notice.audience_type === "class") return notice.audience_class_ids.some((c) => actor.classIds?.includes(c));
    return false;
  }
  return true; // principal sees everything they authored / school-wide
}

async function fetchNotices(schoolId: string) {
  const { supabaseAdmin } = await import("./supabase-admin");
  const { data, error } = await supabaseAdmin
    .from("notices")
    .select("*, notice_attachments(*)")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NoticeRow[];
}

async function viewCountsFor(noticeIds: string[]) {
  if (noticeIds.length === 0) return new Map<string, number>();
  const { supabaseAdmin } = await import("./supabase-admin");
  const { data, error } = await supabaseAdmin.from("notice_views").select("notice_id").in("notice_id", noticeIds);
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.notice_id, (counts.get(row.notice_id) ?? 0) + 1);
  return counts;
}

async function viewedSetFor(noticeIds: string[], viewerType: "student" | "teacher", viewerId: string) {
  if (noticeIds.length === 0) return new Set<string>();
  const { supabaseAdmin } = await import("./supabase-admin");
  const { data, error } = await supabaseAdmin
    .from("notice_views")
    .select("notice_id")
    .in("notice_id", noticeIds)
    .eq("viewer_type", viewerType)
    .eq("viewer_id", viewerId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.notice_id));
}

/** Notices visible to the current actor (student inbox / teacher & principal "school notices" feed). */
export const listNoticesFor = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    const all = await fetchNotices(actor.schoolId);
    const relevant = all.filter((n) => STUDENT_AUDIENCES.includes(n.audience_type) && actorIsRecipient(actor, n));
    const ids = relevant.map((n) => n.id);
    const viewerType = actor.role === "teacher" ? "teacher" : "student";
    const viewed = actor.role === "principal" ? new Set<string>() : await viewedSetFor(ids, viewerType, actor.id);
    const counts = actor.role !== "student" ? await viewCountsFor(ids) : new Map<string, number>();

    return relevant.map((row) => {
      const notice = mapNotice(row);
      if (actor.role === "student" || actor.role === "teacher") {
        notice.viewerHasViewed = viewed.has(row.id);
      }
      if (actor.role === "teacher" && row.author_id === actor.id) {
        notice.recipientCount = resolveRecipients(row).length;
        notice.viewedCount = counts.get(row.id) ?? 0;
      }
      return notice;
    });
  });

/** Notices authored by the current teacher (their "My notices" management list). */
export const listMyNoticesFor = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    if (actor.role !== "teacher" && actor.role !== "principal") throw new ForbiddenError();
    const all = await fetchNotices(actor.schoolId);
    const mine = all.filter((n) => n.author_id === actor.id && STUDENT_AUDIENCES.includes(n.audience_type));
    const ids = mine.map((n) => n.id);
    const counts = await viewCountsFor(ids);
    return mine.map((row) => {
      const notice = mapNotice(row);
      notice.recipientCount = resolveRecipients(row).length;
      notice.viewedCount = counts.get(row.id) ?? 0;
      return notice;
    });
  });

/** Principal → teacher notices, visible to teachers (viewer) and the principal (author). */
export const listTeacherNoticesFor = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    const all = await fetchNotices(actor.schoolId);
    const staffNotices = all.filter((n) => TEACHER_AUDIENCES.includes(n.audience_type));
    const relevant =
      actor.role === "principal" ? staffNotices.filter((n) => n.author_id === actor.id) : staffNotices.filter((n) => actorIsRecipient(actor, n));
    const ids = relevant.map((n) => n.id);
    const viewed = actor.role === "teacher" ? await viewedSetFor(ids, "teacher", actor.id) : new Set<string>();
    const counts = actor.role === "principal" ? await viewCountsFor(ids) : new Map<string, number>();

    return relevant.map((row) => {
      const notice = mapNotice(row);
      if (actor.role === "teacher") notice.viewerHasViewed = viewed.has(row.id);
      if (actor.role === "principal") {
        notice.recipientCount = resolveRecipients(row).length;
        notice.viewedCount = counts.get(row.id) ?? 0;
      }
      return notice;
    });
  });

export interface CreateNoticeInput {
  role: ActorRole;
  actorId?: string;
  title: string;
  body: string;
  audienceType: NoticeAudienceType;
  audienceClassIds?: string[];
  audienceTeacherIds?: string[];
  audienceStudentIds?: string[];
}

/** Accepts a FormData payload so an optional attachment can be uploaded in the same call. */
export const createNotice = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const role = data.get("role") as ActorRole;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role, actorId });
    if (actor.role !== "teacher" && actor.role !== "principal") throw new ForbiddenError("Only teachers or the principal can publish notices.");

    const audienceType = data.get("audienceType") as NoticeAudienceType;
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    if (!title || !body) throw new Error("Title and body are required.");

    const audienceClassIds = JSON.parse(String(data.get("audienceClassIds") ?? "[]")) as string[];
    const audienceTeacherIds = JSON.parse(String(data.get("audienceTeacherIds") ?? "[]")) as string[];
    const audienceStudentIds = JSON.parse(String(data.get("audienceStudentIds") ?? "[]")) as string[];

    // Teachers may only target audiences within classes they teach, and can never target teachers.
    if (actor.role === "teacher") {
      if (TEACHER_AUDIENCES.includes(audienceType)) throw new ForbiddenError("Only the principal can notify teachers.");
      if (audienceType === "class") {
        for (const classId of audienceClassIds) assertTeacherOwnsClass(actor, classId);
      }
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("notices")
      .insert({
        school_id: actor.schoolId,
        author_id: actor.id,
        author_name: actor.name,
        author_role: actor.role,
        title,
        body,
        audience_type: audienceType,
        audience_class_ids: audienceClassIds,
        audience_teacher_ids: audienceTeacherIds,
        audience_student_ids: audienceStudentIds,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not create notice.");

    const file = data.get("attachment");
    if (file instanceof File && file.size > 0) {
      assertValidFile(file);
      const meta = await uploadToBucket(`notices/${inserted.id}`, file);
      const { error: attError } = await supabaseAdmin.from("notice_attachments").insert({ notice_id: inserted.id, ...meta });
      if (attError) throw new Error(attError.message);
    }

    return { id: inserted.id as string };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; noticeId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    const { data: row, error } = await supabaseAdmin.from("notices").select("author_id").eq("id", data.noticeId).single();
    if (error || !row) throw new NotFoundError("Notice not found.");
    if (row.author_id !== actor.id) throw new ForbiddenError("You can only delete your own notices.");
    const { error: delError } = await supabaseAdmin.from("notices").update({ deleted_at: new Date().toISOString() }).eq("id", data.noticeId);
    if (delError) throw new Error(delError.message);
    return { ok: true };
  });

/** Records (or bumps) a view for the current actor — idempotent per (notice, viewer). */
export const recordNoticeView = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; noticeId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    if (actor.role === "principal") return { ok: true };
    const viewerType = actor.role === "teacher" ? "teacher" : "student";

    const { data: existing } = await supabaseAdmin
      .from("notice_views")
      .select("id, view_count")
      .eq("notice_id", data.noticeId)
      .eq("viewer_type", viewerType)
      .eq("viewer_id", actor.id)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      await supabaseAdmin
        .from("notice_views")
        .update({ last_viewed_at: now, view_count: existing.view_count + 1 })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("notice_views").insert({
        notice_id: data.noticeId,
        viewer_type: viewerType,
        viewer_id: actor.id,
        first_viewed_at: now,
        last_viewed_at: now,
        view_count: 1,
      });
    }
    return { ok: true };
  });

/** Teacher/principal-only activity rollup for a notice they authored. */
export const getNoticeActivity = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string; noticeId: string }) => data)
  .handler(async ({ data }): Promise<NoticeActivity> => {
    const actor = resolveActor(data);
    if (actor.role !== "teacher" && actor.role !== "principal") throw new ForbiddenError();

    const { data: row, error } = await supabaseAdmin.from("notices").select("*").eq("id", data.noticeId).single();
    if (error || !row) throw new NotFoundError("Notice not found.");
    if (row.author_id !== actor.id) throw new ForbiddenError("You can only view activity for your own notices.");

    const recipients = resolveRecipients(row as NoticeRow);
    const viewerType = TEACHER_AUDIENCES.includes(row.audience_type) ? "teacher" : "student";

    const { data: views, error: viewsError } = await supabaseAdmin
      .from("notice_views")
      .select("viewer_id, first_viewed_at, last_viewed_at, view_count")
      .eq("notice_id", data.noticeId)
      .eq("viewer_type", viewerType);
    if (viewsError) throw new Error(viewsError.message);

    const viewMap = new Map((views ?? []).map((v) => [v.viewer_id, v]));
    const rows = recipients.map((r) => {
      const v = viewMap.get(r.id);
      return {
        viewerId: r.id,
        viewerName: r.name,
        viewed: Boolean(v),
        firstViewedAt: v?.first_viewed_at ?? null,
        lastViewedAt: v?.last_viewed_at ?? null,
        viewCount: v?.view_count ?? 0,
      };
    });

    return {
      recipientCount: recipients.length,
      viewedCount: rows.filter((r) => r.viewed).length,
      rows,
    };
  });

export async function noticeAttachmentUrl(actorInput: { role: ActorRole; actorId?: string }, noticeId: string, filePath: string): Promise<string> {
  const { supabaseAdmin } = await import("./supabase-admin");
  const { signedUrlFor } = await import("./files");
  const actor = resolveActor(actorInput);
  const { data: row, error } = await supabaseAdmin.from("notices").select("*").eq("id", noticeId).single();
  if (error || !row) throw new NotFoundError("Notice not found.");
  if (!actorIsRecipient(actor, row as NoticeRow) && row.author_id !== actor.id) {
    throw new ForbiddenError("You cannot access this attachment.");
  }
  return signedUrlFor(filePath);
}

export const getNoticeAttachmentUrl = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; noticeId: string; filePath: string }) => data)
  .handler(async ({ data }) => ({ url: await noticeAttachmentUrl(data, data.noticeId, data.filePath) }));
