import { createServerFn } from '@tanstack/react-start';

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

export const listHomework = createServerFn({ method: 'POST' })
  .validator((d: { schoolId: string; role: string; userId: string; classId?: string }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    const { schoolId, role, userId, classId } = data;
    if (role === 'teacher') {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} AND teacher_id = ${userId}
        ORDER BY created_at DESC`;
    }
    if (['principal', 'admin', 'owner'].includes(role)) {
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

export const createHomework = createServerFn({ method: 'POST' })
  .validator((d: {
    schoolId: string; role: string; teacherId: string; teacherName: string;
    title: string; subject: string; classId: string; classLabel: string; section: string;
    description: string; dueDate: string; totalMarks: number; referenceMaterial: string;
  }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    const rows = await sql<HomeworkRow[]>`
      INSERT INTO hw_homework
        (school_id, teacher_id, teacher_name, title, subject, class_id, class_label, section,
         description, due_date, total_marks, reference_material)
      VALUES
        (${data.schoolId}, ${data.teacherId}, ${data.teacherName}, ${data.title}, ${data.subject},
         ${data.classId}, ${data.classLabel}, ${data.section}, ${data.description}, ${data.dueDate},
         ${data.totalMarks}, ${data.referenceMaterial})
      RETURNING *`;
    return rows[0]!;
  });

export const deleteHomework = createServerFn({ method: 'POST' })
  .validator((d: { id: string; teacherId: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    if (data.role === 'teacher') {
      await sql`DELETE FROM hw_homework WHERE id = ${data.id} AND teacher_id = ${data.teacherId}`;
    } else {
      await sql`DELETE FROM hw_homework WHERE id = ${data.id}`;
    }
    return { ok: true };
  });

export const submitHomework = createServerFn({ method: 'POST' })
  .validator((d: {
    homeworkId: string; studentId: string; studentName: string; schoolId: string;
    comment: string; fileName: string; fileSize: number; fileType: string; fileData: string;
    dueDate: string;
  }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    const now = new Date();
    const due = new Date(data.dueDate);
    const status = now > due ? 'late' : 'submitted';
    const rows = await sql<SubmissionRow[]>`
      INSERT INTO hw_submissions
        (homework_id, student_id, student_name, school_id, status, comment, file_name, file_size, file_type, file_data)
      VALUES
        (${data.homeworkId}, ${data.studentId}, ${data.studentName}, ${data.schoolId},
         ${status}, ${data.comment}, ${data.fileName}, ${data.fileSize}, ${data.fileType}, ${data.fileData})
      ON CONFLICT (homework_id, student_id) DO UPDATE SET
        status = EXCLUDED.status, comment = EXCLUDED.comment, file_name = EXCLUDED.file_name,
        file_size = EXCLUDED.file_size, file_type = EXCLUDED.file_type, file_data = EXCLUDED.file_data,
        submitted_at = NOW()
      RETURNING *`;
    return rows[0]!;
  });

export const listStudentSubmissions = createServerFn({ method: 'POST' })
  .validator((d: { studentId: string; schoolId: string }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s
      JOIN hw_homework h ON h.id = s.homework_id
      WHERE s.student_id = ${data.studentId} AND s.school_id = ${data.schoolId}
      ORDER BY s.submitted_at DESC`;
  });

export const listAllSubmissions = createServerFn({ method: 'POST' })
  .validator((d: { schoolId: string; role: string; userId: string }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin', 'owner'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    if (data.role === 'teacher') {
      return sql<SubmissionWithHomework[]>`
        SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
               h.due_date AS homework_due_date, h.teacher_name, h.class_label
        FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
        WHERE h.school_id = ${data.schoolId} AND h.teacher_id = ${data.userId}
        ORDER BY s.submitted_at DESC LIMIT 200`;
    }
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
      WHERE h.school_id = ${data.schoolId}
      ORDER BY s.submitted_at DESC LIMIT 200`;
  });

export const gradeSubmission = createServerFn({ method: 'POST' })
  .validator((d: { submissionId: string; grade: number | null; feedback: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    const rows = await sql<SubmissionRow[]>`
      UPDATE hw_submissions
      SET grade = ${data.grade}, feedback = ${data.feedback}, status = 'graded', reviewed_at = NOW()
      WHERE id = ${data.submissionId}
      RETURNING *`;
    return rows[0]!;
  });
