// SERVER-ONLY. Student homework submission + teacher review/grading.
import { createServerFn } from "@tanstack/react-start";
import type { SubmissionRecord } from "@/types";
import {
  type ActorRole,
  ForbiddenError,
  NotFoundError,
  assertTeacherOwnsStudent,
  resolveActor,
} from "./auth-context";

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

/** Student submits (or resubmits, if the teacher allowed it) a homework assignment. */
export const submitHomework = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const role = data.get("role") as ActorRole;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role, actorId });
    if (actor.role !== "student") throw new ForbiddenError("Only students can submit homework.");

    const homeworkId = String(data.get("homeworkId") ?? "");
    const { data: hw, error: hwError } = await supabaseAdmin.from("homework").select("*").eq("id", homeworkId).single();
    if (hwError || !hw) throw new NotFoundError("Homework not found.");
    if (hw.class_id !== actor.classId) throw new ForbiddenError("This homework is not assigned to your class.");

    const { data: existing } = await supabaseAdmin.from("submissions").select("id").eq("homework_id", homeworkId).eq("student_id", actor.id).maybeSingle();
    if (existing && !hw.allow_resubmission) {
      throw new ForbiddenError("You have already submitted this assignment. Resubmission is not allowed.");
    }

    const comment = String(data.get("comment") ?? "").trim() || null;
    const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new Error("Attach at least one file before submitting.");

    const now = new Date();
    const isLate = new Date(hw.due_at).getTime() < now.getTime();

    let submissionId: string;
    if (existing) {
      submissionId = existing.id;
      const { error } = await supabaseAdmin
        .from("submissions")
        .update({
          comment,
          status: isLate ? "late" : "submitted",
          submitted_at: now.toISOString(),
          marks: null,
          feedback: null,
          reviewed_at: null,
        })
        .eq("id", submissionId);
      if (error) throw new Error(error.message);
      // Resubmission replaces the file set.
      const { data: oldFiles } = await supabaseAdmin.from("submission_files").select("file_path").eq("submission_id", submissionId);
      if (oldFiles?.length) {
        await supabaseAdmin.storage.from("shwai-files").remove(oldFiles.map((f) => f.file_path));
        await supabaseAdmin.from("submission_files").delete().eq("submission_id", submissionId);
      }
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("submissions")
        .insert({
          homework_id: homeworkId,
          student_id: actor.id,
          student_name: actor.name,
          comment,
          status: isLate ? "late" : "submitted",
          submitted_at: now.toISOString(),
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Could not submit homework.");
      submissionId = inserted.id;
    }

    for (const file of files) {
      assertValidFile(file);
      const meta = await uploadToBucket(`submissions/${submissionId}`, file);
      const { error: fileError } = await supabaseAdmin.from("submission_files").insert({ submission_id: submissionId, ...meta });
      if (fileError) throw new Error(fileError.message);
    }

    return { id: submissionId, late: isLate };
  });

/**
 * Submissions visible to the current actor:
 * - student: only their own.
 * - teacher: for a given homeworkId (their own) and/or studentId (their own student).
 */
export const listSubmissionsFor = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string; homeworkId?: string; studentId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    let query = supabaseAdmin.from("submissions").select("*, submission_files(*)");

    if (actor.role === "student") {
      query = query.eq("student_id", actor.id);
    } else if (actor.role === "teacher") {
      if (data.studentId) assertTeacherOwnsStudent(actor, data.studentId);
      if (data.homeworkId) {
        const { data: hw } = await supabaseAdmin.from("homework").select("teacher_id").eq("id", data.homeworkId).single();
        if (!hw || hw.teacher_id !== actor.id) throw new ForbiddenError("You can only view submissions for your own homework.");
        query = query.eq("homework_id", data.homeworkId);
      } else if (data.studentId) {
        query = query.eq("student_id", data.studentId);
      } else {
        throw new Error("Provide homeworkId or studentId.");
      }
    }
    // Principal: unrestricted school-wide read (no extra filter needed beyond RLS-equivalent server gate).

    const { data: rows, error } = await query.order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => mapSubmission(r as SubmissionRow));
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; submissionId: string; marks?: number; feedback?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { assertValidFile, signedUrlFor, uploadToBucket } = await import("./files");
    const actor = resolveActor(data);
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can grade submissions.");

    const { data: sub, error } = await supabaseAdmin.from("submissions").select("id, homework_id").eq("id", data.submissionId).single();
    if (error || !sub) throw new NotFoundError("Submission not found.");
    const { data: hw } = await supabaseAdmin.from("homework").select("teacher_id").eq("id", sub.homework_id).single();
    if (!hw || hw.teacher_id !== actor.id) throw new ForbiddenError("You can only grade submissions for your own homework.");

    const { error: updateError } = await supabaseAdmin
      .from("submissions")
      .update({
        marks: data.marks ?? null,
        feedback: data.feedback ?? null,
        status: "graded",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.submissionId);
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

export async function submissionFileUrl(actorInput: { role: ActorRole; actorId?: string }, submissionId: string, filePath: string): Promise<string> {
  const { supabaseAdmin } = await import("./supabase-admin");
  const { signedUrlFor } = await import("./files");
  const actor = resolveActor(actorInput);
  const { data: sub, error } = await supabaseAdmin.from("submissions").select("student_id, homework_id").eq("id", submissionId).single();
  if (error || !sub) throw new NotFoundError("Submission not found.");

  if (actor.role === "student" && sub.student_id !== actor.id) throw new ForbiddenError();
  if (actor.role === "teacher") {
    const { data: hw } = await supabaseAdmin.from("homework").select("teacher_id").eq("id", sub.homework_id).single();
    if (!hw || hw.teacher_id !== actor.id) throw new ForbiddenError();
  }
  return signedUrlFor(filePath);
}

export const getSubmissionFileUrl = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; submissionId: string; filePath: string }) => data)
  .handler(async ({ data }) => ({ url: await submissionFileUrl(data, data.submissionId, data.filePath) }));
