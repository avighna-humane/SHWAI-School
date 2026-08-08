/**
 * SERVER-ONLY submission functions. See auth-context.ts for the identity model.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "./supabase-admin";
import { ForbiddenError, NotFoundError, assertTeacherOwnsStudent, resolveActor } from "./auth-context";
import { uploadAttachment } from "./files";

const actorSchema = { role: z.string(), actorId: z.string() };

const attachmentInputSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  base64Data: z.string(),
});

export const submitHomework = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ...actorSchema,
      homeworkId: z.string(),
      comment: z.string().max(2000).default(""),
      files: z.array(attachmentInputSchema).min(1).max(5),
    }),
  )
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "student") throw new ForbiddenError("Only students can submit homework.");

    const supabase = supabaseAdmin();
    const { data: homework } = await supabase.from("homework").select("*").eq("id", data.homeworkId).is("deleted_at", null).single();
    if (!homework) throw new NotFoundError("Homework not found.");
    if (homework.class_id !== actor.classId) throw new ForbiddenError("This homework is not assigned to your class.");
    if (homework.status === "closed") throw new ForbiddenError("This homework is closed for submissions.");

    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("homework_id", data.homeworkId)
      .eq("student_id", actor.id)
      .maybeSingle();
    if (existing && !homework.allow_resubmission) {
      throw new ForbiddenError("You have already submitted this homework and resubmission is not allowed.");
    }

    const isLate = new Date() > new Date(homework.due_at);
    const now = new Date().toISOString();

    let submissionId: string;
    if (existing) {
      submissionId = existing.id;
      const { error } = await supabase
        .from("submissions")
        .update({ comment: data.comment, status: isLate ? "late" : "submitted", submitted_at: now, marks: null, feedback: null, reviewed_at: null })
        .eq("id", submissionId);
      if (error) throw new Error(error.message);
      // Clear previous files for a clean resubmission.
      await supabase.from("submission_files").delete().eq("submission_id", submissionId);
    } else {
      const { data: inserted, error } = await supabase
        .from("submissions")
        .insert({
          homework_id: data.homeworkId,
          student_id: actor.id,
          student_name: actor.name,
          comment: data.comment,
          status: isLate ? "late" : "submitted",
          submitted_at: now,
        })
        .select()
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Failed to submit homework.");
      submissionId = inserted.id;
    }

    for (const file of data.files) {
      const meta = await uploadAttachment({ prefix: `submissions/${submissionId}`, fileName: file.fileName, mimeType: file.mimeType, base64Data: file.base64Data });
      await supabase.from("submission_files").insert({
        submission_id: submissionId,
        file_path: meta.filePath,
        file_name: meta.fileName,
        size_bytes: meta.sizeBytes,
        mime_type: meta.mimeType,
      });
    }

    return { ok: true, id: submissionId, late: isLate };
  });

export const getMySubmission = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, homeworkId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "student") throw new ForbiddenError("Only students have their own submissions.");
    const supabase = supabaseAdmin();
    const { data: submission } = await supabase
      .from("submissions")
      .select("*, submission_files(*)")
      .eq("homework_id", data.homeworkId)
      .eq("student_id", actor.id)
      .maybeSingle();
    return submission ?? null;
  });

export const listSubmissionsForHomework = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, homeworkId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    const supabase = supabaseAdmin();
    const { data: homework } = await supabase.from("homework").select("teacher_id").eq("id", data.homeworkId).single();
    if (!homework) throw new NotFoundError("Homework not found.");
    if (actor.role === "teacher" && homework.teacher_id !== actor.id) throw new ForbiddenError("You did not create this homework.");
    if (actor.role === "student") throw new ForbiddenError("Students cannot list all submissions.");

    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*, submission_files(*)")
      .eq("homework_id", data.homeworkId)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return submissions ?? [];
  });

export const listSubmissionsForStudent = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, studentId: z.string() }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role === "student" && actor.id !== data.studentId) {
      throw new ForbiddenError("You can only view your own submissions.");
    }
    if (actor.role === "teacher") {
      assertTeacherOwnsStudent(actor, data.studentId);
    }
    const supabase = supabaseAdmin();
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*, submission_files(*), homework:homework_id(title, subject, due_at, total_marks)")
      .eq("student_id", data.studentId)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return submissions ?? [];
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .validator(z.object({ ...actorSchema, submissionId: z.string(), marks: z.number().min(0), feedback: z.string().max(3000).default("") }))
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    if (actor.role !== "teacher") throw new ForbiddenError("Only teachers can grade submissions.");

    const supabase = supabaseAdmin();
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, homework_id, homework:homework_id(teacher_id, total_marks)")
      .eq("id", data.submissionId)
      .single();
    if (!submission) throw new NotFoundError("Submission not found.");
    const homework = submission.homework as any;
    if (homework.teacher_id !== actor.id) throw new ForbiddenError("You did not create this homework.");
    if (data.marks > homework.total_marks) throw new Error(`Marks cannot exceed ${homework.total_marks}.`);

    const { error } = await supabase
      .from("submissions")
      .update({ marks: data.marks, feedback: data.feedback, status: "graded", reviewed_at: new Date().toISOString() })
      .eq("id", data.submissionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
