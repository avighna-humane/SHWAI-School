// SERVER-ONLY. Teacher homework creation + student homework feed + view
// tracking + the teacher-facing "Student Activity" rollup.
import { createServerFn } from "@tanstack/react-start";
import type { HomeworkActivity, HomeworkItem, SubmissionRecord } from "@/types";
import { STUDENTS } from "@/data/mock/people";
import { classSectionById } from "./auth-context";
import { supabaseAdmin } from "./supabase-admin";
import { assertValidFile, signedUrlFor, uploadToBucket } from "./files";
import {
  type ActorRole,
  ForbiddenError,
  NotFoundError,
  assertTeacherOwnsClass,
  resolveActor,
} from "./auth-context";

interface HomeworkRow {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name: string;
  subject: string;
  class_id: string;
  class_label: string;
  title: string;
  description: string;
  due_at: string;
  total_marks: number | null;
  allow_resubmission: boolean;
  status: "draft" | "published" | "closed";
  created_at: string;
  deleted_at: string | null;
  homework_attachments?: { id: string; file_path: string; file_name: string; size_bytes: number; mime_type: string }[];
}

interface SubmissionRow {
  id: string;
  homework_id: string;
  student_id: string;
  student_name: string;
  comment: string | null;
  status: "submitted" | "late" | "graded";
  submitted_at: string;
  marks: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  submission_files?: { id: string; file_path: string; file_name: string; size_bytes: number; mime_type: string }[];
}

function mapHomework(row: HomeworkRow): HomeworkItem {
  return {
    id: row.id,
    schoolId: row.school_id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    subject: row.subject,
    classId: row.class_id,
    classLabel: row.class_label,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    totalMarks: row.total_marks,
    allowResubmission: row.allow_resubmission,
    status: row.status,
    createdAt: row.created_at,
    attachments: (row.homework_attachments ?? []).map((a) => ({
      id: a.id,
      filePath: a.file_path,
      fileName: a.file_name,
      sizeBytes: a.size_bytes,
      mimeType: a.mime_type,
    })),
  };
}

function mapSubmission(row: SubmissionRow): SubmissionRecord {
  return {
    id: row.id,
    homeworkId: row.homework_id,
    studentId: row.student_id,
    studentName: row.student_name,
    comment: row.comment,
    status: row.status,
    submittedAt: row.submitted_at,
    marks: row.marks,
    feedback: row.feedback,
    reviewedAt: row.reviewed_at,
    files: (row.submission_files ?? []).map((f) => ({
      id: f.id,
      filePath: f.file_path,
      fileName: f.file_name,
      sizeBytes: f.size_bytes,
      mimeType: f.mime_type,
    })),
  };
}

function classRoster(classId: string) {
  return STUDENTS.filter((s) => s.classId === classId && s.status === "active");
}

/** Homework feed for the current actor (student assigned feed / teacher & principal "my homework" list). */
export const listHomeworkFor = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);

    let query = supabaseAdmin.from("homework").select("*, homework_attachments(*)").eq("school_id", actor.schoolId).is("deleted_at", null);
    if (actor.role === "student") {
      query = query.eq("class_id", actor.classId).eq("status", "published");
    } else if (actor.role === "teacher") {
      query = query.eq("teacher_id", actor.id);
    }
    const { data: rows, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const homeworkRows = (rows ?? []) as HomeworkRow[];
    const ids = homeworkRows.map((h) => h.id);

    if (actor.role === "student") {
      const [{ data: views }, { data: subs }] = await Promise.all([
        supabaseAdmin.from("homework_views").select("homework_id").eq("student_id", actor.id).in("homework_id", ids),
        supabaseAdmin.from("submissions").select("*, submission_files(*)").eq("student_id", actor.id).in("homework_id", ids),
      ]);
      const viewedSet = new Set((views ?? []).map((v) => v.homework_id));
      const subMap = new Map((subs ?? []).map((s) => [s.homework_id, mapSubmission(s as SubmissionRow)]));
      return homeworkRows.map((row) => {
        const item = mapHomework(row);
        item.viewerHasViewed = viewedSet.has(row.id);
        item.viewerSubmission = subMap.get(row.id) ?? null;
        return item;
      });
    }

    // Teacher / principal: attach rollup counts.
    const [{ data: views }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("homework_views").select("homework_id").in("homework_id", ids),
      supabaseAdmin.from("submissions").select("homework_id, status").in("homework_id", ids),
    ]);
    const viewedCounts = new Map<string, number>();
    for (const v of views ?? []) viewedCounts.set(v.homework_id, (viewedCounts.get(v.homework_id) ?? 0) + 1);
    const submittedCounts = new Map<string, number>();
    const lateCounts = new Map<string, number>();
    for (const s of subs ?? []) {
      submittedCounts.set(s.homework_id, (submittedCounts.get(s.homework_id) ?? 0) + 1);
      if (s.status === "late") lateCounts.set(s.homework_id, (lateCounts.get(s.homework_id) ?? 0) + 1);
    }

    return homeworkRows.map((row) => {
      const item = mapHomework(row);
      item.assignedCount = classRoster(row.class_id).length;
      item.viewedCount = viewedCounts.get(row.id) ?? 0;
      item.submittedCount = submittedCounts.get(row.id) ?? 0;
      item.lateCount = lateCounts.get(row.id) ?? 0;
      return item;
    });
  });

/** Single homework detail, scoped/authorized per role. */
export const getHomeworkById = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const { data: row, error } = await supabaseAdmin
      .from("homework")
      .select("*, homework_attachments(*)")
      .eq("id", data.homeworkId)
      .is("deleted_at", null)
      .single();
    if (error || !row) throw new NotFoundError("Homework not found.");
    const homeworkRow = row as HomeworkRow;

    if (actor.role === "student" && homeworkRow.class_id !== actor.classId) {
      throw new ForbiddenError("This homework is not assigned to your class.");
    }
    if (actor.role === "teacher" && homeworkRow.teacher_id !== actor.id) {
      throw new ForbiddenError("You can only view homework you created.");
    }

    const item = mapHomework(homeworkRow);

    if (actor.role === "student") {
      const { data: sub } = await supabaseAdmin
        .from("submissions")
        .select("*, submission_files(*)")
        .eq("homework_id", data.homeworkId)
        .eq("student_id", actor.id)
        .maybeSingle();
      item.viewerSubmission = sub ? mapSubmission(sub as SubmissionRow) : null;
      const { data: view } = await supabaseAdmin
        .from("homework_views")
        .select("id")
        .eq("homework_id", data.homeworkId)
        .eq("student_id", actor.id)
        .maybeSingle();
      item.viewerHasViewed = Boolean(view);
    } else {
      item.assignedCount = classRoster(homeworkRow.class_id).length;
    }

    return item;
  });

export interface CreateHomeworkInput {
  role: ActorRole;
  actorId?: string;
  subject: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
  totalMarks?: number;
  allowResubmission?: boolean;
}

export const createHomework = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const role = data.get("role") as ActorRole;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role, actorId });
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can create homework.");

    const classId = String(data.get("classId") ?? "");
    assertTeacherOwnsClass(actor, classId);
    const classInfo = classSectionById(classId);
    if (!classInfo) throw new NotFoundError("Class not found.");

    const title = String(data.get("title") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const dueAt = String(data.get("dueAt") ?? "");
    if (!title || !subject || !description || !dueAt) throw new Error("Title, subject, description and due date are required.");

    const totalMarksRaw = data.get("totalMarks");
    const totalMarks = totalMarksRaw ? Number(totalMarksRaw) : null;
    const allowResubmission = data.get("allowResubmission") === "true";

    const { data: inserted, error } = await supabaseAdmin
      .from("homework")
      .insert({
        school_id: actor.schoolId,
        teacher_id: actor.id,
        teacher_name: actor.name,
        subject,
        class_id: classId,
        class_label: classInfo.label,
        title,
        description,
        due_at: dueAt,
        total_marks: totalMarks,
        allow_resubmission: allowResubmission,
        status: "published",
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not create homework.");

    const files = data.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files) {
      assertValidFile(file);
      const meta = await uploadToBucket(`homework/${inserted.id}`, file);
      const { error: attError } = await supabaseAdmin.from("homework_attachments").insert({ homework_id: inserted.id, ...meta });
      if (attError) throw new Error(attError.message);
    }

    return { id: inserted.id as string };
  });

/** Teacher edits their own homework. Class/subject stay fixed so roster + activity rollups stay consistent. */
export const updateHomework = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const role = data.get("role") as ActorRole;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role, actorId });
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can edit homework.");

    const homeworkId = String(data.get("homeworkId") ?? "");
    const { data: hw, error: hwError } = await supabaseAdmin.from("homework").select("id, teacher_id").eq("id", homeworkId).is("deleted_at", null).single();
    if (hwError || !hw) throw new NotFoundError("Homework not found.");
    if (hw.teacher_id !== actor.id) throw new ForbiddenError("You can only edit homework you created.");

    const title = String(data.get("title") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const dueAt = String(data.get("dueAt") ?? "");
    if (!title || !subject || !description || !dueAt) throw new Error("Title, subject, description and due date are required.");

    const totalMarksRaw = data.get("totalMarks");
    const totalMarks = totalMarksRaw ? Number(totalMarksRaw) : null;
    const allowResubmission = data.get("allowResubmission") === "true";

    const { error } = await supabaseAdmin
      .from("homework")
      .update({ title, subject, description, due_at: dueAt, total_marks: totalMarks, allow_resubmission: allowResubmission })
      .eq("id", homeworkId);
    if (error) throw new Error(error.message);

    const files = data.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files) {
      assertValidFile(file);
      const meta = await uploadToBucket(`homework/${homeworkId}`, file);
      const { error: attError } = await supabaseAdmin.from("homework_attachments").insert({ homework_id: homeworkId, ...meta });
      if (attError) throw new Error(attError.message);
    }

    return { id: homeworkId };
  });

/** Teacher removes an attachment they added while editing homework (before or after publish). */
export const deleteHomeworkAttachment = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string; attachmentId: string; filePath: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can edit homework.");
    const { data: hw, error } = await supabaseAdmin.from("homework").select("teacher_id").eq("id", data.homeworkId).single();
    if (error || !hw) throw new NotFoundError("Homework not found.");
    if (hw.teacher_id !== actor.id) throw new ForbiddenError("You can only edit homework you created.");

    await supabaseAdmin.storage.from("shwai-files").remove([data.filePath]);
    const { error: delError } = await supabaseAdmin.from("homework_attachments").delete().eq("id", data.attachmentId);
    if (delError) throw new Error(delError.message);
    return { ok: true };
  });

/** Soft delete — teacher's own homework only. Filtered out of every list/detail query via deleted_at. */
export const deleteHomework = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can delete homework.");
    const { data: hw, error } = await supabaseAdmin.from("homework").select("teacher_id").eq("id", data.homeworkId).single();
    if (error || !hw) throw new NotFoundError("Homework not found.");
    if (hw.teacher_id !== actor.id) throw new ForbiddenError("You can only delete homework you created.");

    const { error: delError } = await supabaseAdmin.from("homework").update({ deleted_at: new Date().toISOString() }).eq("id", data.homeworkId);
    if (delError) throw new Error(delError.message);
    return { ok: true };
  });

/** Idempotent per (homework, student) — repeat opens bump view_count, never inflate the "viewed" count. */
export const recordHomeworkView = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "student") return { ok: true };

    const { data: hw } = await supabaseAdmin.from("homework").select("class_id").eq("id", data.homeworkId).single();
    if (!hw || hw.class_id !== actor.classId) throw new ForbiddenError("This homework is not assigned to your class.");

    const { data: existing } = await supabaseAdmin
      .from("homework_views")
      .select("id, view_count")
      .eq("homework_id", data.homeworkId)
      .eq("student_id", actor.id)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      await supabaseAdmin.from("homework_views").update({ last_viewed_at: now, view_count: existing.view_count + 1 }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("homework_views").insert({
        homework_id: data.homeworkId,
        student_id: actor.id,
        first_viewed_at: now,
        last_viewed_at: now,
        view_count: 1,
      });
    }
    return { ok: true };
  });

/** Teacher/principal "Student Activity" rollup for one homework assignment. */
export const getHomeworkActivity = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string }) => data)
  .handler(async ({ data }): Promise<HomeworkActivity> => {
    const actor = resolveActor(data);
    const { data: row, error } = await supabaseAdmin.from("homework").select("*").eq("id", data.homeworkId).single();
    if (error || !row) throw new NotFoundError("Homework not found.");
    if (actor.role === "teacher" && row.teacher_id !== actor.id) throw new ForbiddenError("You can only view activity for your own homework.");
    if (actor.role === "student") throw new ForbiddenError("Students cannot view class-wide activity.");

    const roster = classRoster(row.class_id);
    const [{ data: views }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("homework_views").select("student_id, first_viewed_at").eq("homework_id", data.homeworkId),
      supabaseAdmin.from("submissions").select("student_id, status, submitted_at").eq("homework_id", data.homeworkId),
    ]);
    const viewMap = new Map((views ?? []).map((v) => [v.student_id, v.first_viewed_at]));
    const subMap = new Map((subs ?? []).map((s) => [s.student_id, s]));

    const rows = roster.map((student) => {
      const sub = subMap.get(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        viewed: viewMap.has(student.id),
        firstViewedAt: viewMap.get(student.id) ?? null,
        submitted: Boolean(sub),
        submissionStatus: (sub?.status as SubmissionRecord["status"]) ?? null,
        submittedAt: sub?.submitted_at ?? null,
      };
    });

    return {
      assignedCount: rows.length,
      viewedCount: rows.filter((r) => r.viewed).length,
      notViewedCount: rows.filter((r) => !r.viewed).length,
      submittedCount: rows.filter((r) => r.submitted).length,
      notSubmittedCount: rows.filter((r) => !r.submitted).length,
      lateCount: rows.filter((r) => r.submissionStatus === "late").length,
      rows,
    };
  });

export async function homeworkAttachmentUrl(actorInput: { role: ActorRole; actorId?: string }, homeworkId: string, filePath: string): Promise<string> {
  const actor = resolveActor(actorInput);
  const { data: row, error } = await supabaseAdmin.from("homework").select("class_id, teacher_id").eq("id", homeworkId).single();
  if (error || !row) throw new NotFoundError("Homework not found.");
  if (actor.role === "student" && row.class_id !== actor.classId) throw new ForbiddenError();
  if (actor.role === "teacher" && row.teacher_id !== actor.id) throw new ForbiddenError();
  return signedUrlFor(filePath);
}

export const getHomeworkAttachmentUrl = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId: string; filePath: string }) => data)
  .handler(async ({ data }) => ({ url: await homeworkAttachmentUrl(data, data.homeworkId, data.filePath) }));
