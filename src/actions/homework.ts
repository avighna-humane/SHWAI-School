import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireRole } from "@/lib/auth";

// ── Types (exported for use in route files via `import type`) ─────────────────
export interface HomeworkRow {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  subject: string;
  class_id: string;
  class_label: string;
  section: string;
  description: string;
  due_date: string;
  total_marks: number;
  reference_material: string;
  status: string;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  homework_id: string;
  student_id: string;
  student_name: string;
  school_id: string;
  status: string;
  comment: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_data: string;
  submitted_at: string;
  reviewed_at: string | null;
  grade: number | null;
  feedback: string;
}

export type SubmissionWithHomework = SubmissionRow & {
  homework_title: string;
  homework_subject: string;
  homework_due_date: string;
  teacher_name: string;
  class_label: string;
};

// ── Server Functions (all db access via dynamic import to avoid client-bundle issues) ──

export const listHomework = createServerFn({ method: "POST" })
  .validator((d: { schoolId: string; role: string; userId: string; classId?: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (data.schoolId !== context.schoolId) throw new Error("Cross-school access denied");
    const { sql } = await import("@/lib/db");
    const schoolId = context.schoolId;
    const role = context.role;
    const userId = context.userId;
    const { classId } = data;
    if (role === "teacher") {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} AND teacher_id = ${userId}
        ORDER BY created_at DESC`;
    }
    if (["principal", "admin", "owner"].includes(role)) {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} ORDER BY created_at DESC`;
    }
    if (classId) {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} AND class_id = ${classId} AND status = 'published'
        ORDER BY created_at DESC`;
    }
    return [] as HomeworkRow[];
  });

export const createHomework = createServerFn({ method: "POST" })
  .validator(
    (d: {
      schoolId: string;
      role: string;
      teacherId: string;
      teacherName: string;
      title: string;
      subject: string;
      classId: string;
      classLabel: string;
      section: string;
      description: string;
      dueDate: string;
      totalMarks: number;
      referenceMaterial: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    if (data.schoolId !== context.schoolId) throw new Error("Cross-school access denied");
    if (data.teacherId !== context.userId) throw new Error("Teacher identity mismatch");
    const { sql } = await import("@/lib/db");
    const rows = await sql<HomeworkRow[]>`
      INSERT INTO hw_homework
        (school_id, teacher_id, teacher_name, title, subject, class_id, class_label, section,
         description, due_date, total_marks, reference_material)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${data.title}, ${data.subject},
         ${data.classId}, ${data.classLabel}, ${data.section}, ${data.description}, ${data.dueDate},
         ${data.totalMarks}, ${data.referenceMaterial})
      RETURNING *`;
    return rows[0]!;
  });

export const deleteHomework = createServerFn({ method: "POST" })
  .validator((d: { id: string; teacherId: string; role: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    if (data.teacherId !== context.userId && context.role === "teacher")
      throw new Error("Teacher identity mismatch");
    const { sql } = await import("@/lib/db");
    const rows = await sql<{ id: string }[]>`
      DELETE FROM hw_homework
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
        AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
      RETURNING id`;
    if (!rows[0]) throw new Error("Homework not found or not authorized");
    return { ok: true as const };
  });

export const submitHomework = createServerFn({ method: "POST" })
  .validator(
    (d: {
      homeworkId: string;
      studentId: string;
      studentName: string;
      schoolId: string;
      comment: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      fileData: string;
      dueDate: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    if (data.schoolId !== context.schoolId || data.studentId !== context.userId)
      throw new Error("Student identity or school mismatch");
    const { sql } = await import("@/lib/db");
    const now = new Date();
    const due = new Date(data.dueDate);
    const status = now > due ? "late" : "submitted";
    const rows = await sql<SubmissionRow[]>`
      INSERT INTO hw_submissions
        (homework_id, student_id, student_name, school_id, status, comment, file_name, file_size, file_type, file_data)
      VALUES
        (${data.homeworkId}, ${context.userId}, ${context.name}, ${context.schoolId},
         ${status}, ${data.comment}, ${data.fileName}, ${data.fileSize}, ${data.fileType}, ${data.fileData})
      ON CONFLICT (homework_id, student_id) DO UPDATE SET
        status = EXCLUDED.status, comment = EXCLUDED.comment, file_name = EXCLUDED.file_name,
        file_size = EXCLUDED.file_size, file_type = EXCLUDED.file_type, file_data = EXCLUDED.file_data,
        submitted_at = NOW()
      RETURNING *`;
    return rows[0]!;
  });

export const listStudentSubmissions = createServerFn({ method: "POST" })
  .validator((d: { studentId: string; schoolId: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    if (data.studentId !== context.userId || data.schoolId !== context.schoolId)
      throw new Error("Student identity or school mismatch");
    const { sql } = await import("@/lib/db");
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s
      JOIN hw_homework h ON h.id = s.homework_id
      WHERE s.student_id = ${context.userId} AND s.school_id = ${context.schoolId}
      ORDER BY s.submitted_at DESC`;
  });

export const listAllSubmissions = createServerFn({ method: "POST" })
  .validator((d: { schoolId: string; role: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin", "owner"]);
    if (data.schoolId !== context.schoolId) throw new Error("Cross-school access denied");
    const { sql } = await import("@/lib/db");
    if (context.role === "teacher") {
      return sql<SubmissionWithHomework[]>`
        SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
               h.due_date AS homework_due_date, h.teacher_name, h.class_label
        FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
        WHERE h.school_id = ${context.schoolId} AND h.teacher_id = ${context.userId}
        ORDER BY s.submitted_at DESC LIMIT 200`;
    }
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
      WHERE h.school_id = ${context.schoolId}
      ORDER BY s.submitted_at DESC LIMIT 200`;
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .validator(
    (d: { submissionId: string; grade: number | null; feedback: string; role: string }) => d,
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    const { sql } = await import("@/lib/db");
    const rows = await sql<SubmissionRow[]>`
      UPDATE hw_submissions
      SET grade = ${data.grade}, feedback = ${data.feedback}, status = 'graded', reviewed_at = NOW()
      WHERE id = ${data.submissionId}
        AND homework_id IN (
          SELECT id FROM hw_homework
          WHERE school_id = ${context.schoolId}
            AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
        )
      RETURNING *`;
    if (!rows[0]) throw new Error("Submission not found or not authorized");
    return rows[0];
  });
