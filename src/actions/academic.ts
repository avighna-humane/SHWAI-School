import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { validateMarks } from "@/lib/academic-policies";

const teacherRoles = ["teacher", "principal", "admin", "owner"] as const;
const staffRoles = ["staff", "teacher", "principal", "admin", "owner"] as const;
const leadershipRoles = ["principal", "admin", "owner"] as const;

function isStaffRole(role: string): boolean {
  return staffRoles.includes(role as (typeof staffRoles)[number]);
}
function isTeacherRole(role: string): boolean {
  return teacherRoles.includes(role as (typeof teacherRoles)[number]);
}

const assessmentInput = z.object({
  academicYearId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  subjectId: z.string().trim().max(80).optional(),
  subject: z.string().trim().min(2).max(120),
  classId: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  assessmentType: z.enum(["quiz", "test", "examination", "assignment"]),
  maximumMarks: z.number().positive().max(10000),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().positive().max(600).optional(),
  instructions: z.string().trim().max(5000).default(""),
});

const questionInput = z.object({
  assessmentId: z.string().min(1),
  questionType: z.enum(["mcq", "subjective"]),
  prompt: z.string().trim().min(2).max(5000),
  options: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  correctAnswer: z.string().trim().max(500).optional(),
  marks: z.number().positive().max(1000),
  answerKey: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export interface AssessmentRow {
  id: string;
  school_id: string;
  academic_year_id: string;
  title: string;
  subject_id: string | null;
  subject: string;
  class_id: string;
  section_id: string | null;
  teacher_id: string;
  assessment_type: string;
  maximum_marks: number;
  assessment_date: string;
  duration_minutes: number | null;
  instructions: string;
  status: string;
  published_at: string | null;
  closed_at: string | null;
}

export interface AssessmentQuestionRow {
  id: string;
  assessment_id: string;
  question_type: "mcq" | "subjective";
  prompt: string;
  options: string[];
  correct_answer: string | null;
  marks: number;
  answer_key: string | null;
  sort_order: number;
}

export interface GradeRow {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  subject_id: string | null;
  subject: string;
  teacher_id: string;
  assessment_id: string | null;
  homework_id: string | null;
  maximum_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string | null;
  feedback: string;
  publication_status: "draft" | "published";
  published_at: string | null;
}

export interface ReportCardRow {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string | null;
  section_id: string | null;
  status: "draft" | "review" | "published";
  overall_percentage: number | null;
  overall_grade: string | null;
  attendance_percentage: number | null;
  teacher_feedback: string;
  published_at: string | null;
}

export interface TimetableRow {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  subject_id: string | null;
  subject: string;
  teacher_id: string;
  room: string;
  weekday: number;
  start_time: string;
  end_time: string;
  status: "draft" | "published";
}

export const updateHomeworkLifecycle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["draft", "published", "closed"]),
      title: z.string().trim().min(2).max(160).optional(),
      description: z.string().trim().max(5000).optional(),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      difficulty: z.enum(["easy", "standard", "hard"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const sql = requireDatabase();
    const rows = await sql`
      UPDATE hw_homework
      SET status = ${data.status}, publication_status = ${data.status},
          title = COALESCE(${data.title ?? null}, title),
          description = COALESCE(${data.description ?? null}, description),
          due_date = COALESCE(${data.dueDate ?? null}, due_date),
          difficulty = COALESCE(${data.difficulty ?? null}, difficulty),
          closed_at = CASE WHEN ${data.status} = 'closed' THEN NOW() ELSE closed_at END
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
        AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
      RETURNING *`;
    if (!rows[0]) throw new Error("Homework not found or not authorized");
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'homework', ${data.id}, ${`Homework status changed to ${data.status}`})`;
    return rows[0];
  });

export const listAssessments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (isTeacherRole(context.role)) {
    return sql<AssessmentRow[]>`
      SELECT * FROM hw_assessments WHERE school_id = ${context.schoolId}
        AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
      ORDER BY assessment_date DESC LIMIT 500`;
  }
  if (context.role === "student") {
    return sql<AssessmentRow[]>`
      SELECT a.* FROM hw_assessments a
      JOIN hw_enrollments e ON e.class_id = a.class_id AND e.student_id = ${context.userId} AND e.academic_year_id = a.academic_year_id
      WHERE a.school_id = ${context.schoolId} AND a.status = 'published'
      ORDER BY a.assessment_date ASC LIMIT 200`;
  }
  if (context.role === "parent") {
    return sql<AssessmentRow[]>`
      SELECT DISTINCT a.* FROM hw_assessments a
      JOIN hw_enrollments e ON e.class_id = a.class_id AND e.academic_year_id = a.academic_year_id
      JOIN hw_parent_students ps ON ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE
      WHERE a.school_id = ${context.schoolId} AND a.status = 'published'
      ORDER BY a.assessment_date ASC LIMIT 500`;
  }
  return [] as AssessmentRow[];
});

export const createAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const sql = requireDatabase();
    if (context.role === "teacher") {
      const assignment = data.subjectId
        ? await sql<{ teacher_id: string }[]>`
            SELECT teacher_id FROM hw_teacher_assignments
            WHERE school_id = ${context.schoolId} AND teacher_id = ${context.userId}
              AND class_id = ${data.classId} AND subject_id = ${data.subjectId}
            LIMIT 1`
        : await sql<{ teacher_id: string }[]>`
            SELECT teacher_id FROM hw_teacher_assignments
            WHERE school_id = ${context.schoolId} AND teacher_id = ${context.userId}
              AND class_id = ${data.classId}
            LIMIT 1`;
      if (!assignment[0]) throw new Error("Teacher is not assigned to this class and subject");
    }
    const rows = await sql<AssessmentRow[]>`
      INSERT INTO hw_assessments
        (school_id, academic_year_id, title, subject_id, subject, class_id, section_id, teacher_id,
         assessment_type, maximum_marks, assessment_date, duration_minutes, instructions)
      VALUES
        (${context.schoolId}, ${data.academicYearId}, ${data.title}, ${data.subjectId ?? null}, ${data.subject},
         ${data.classId}, ${data.sectionId ?? null}, ${context.userId}, ${data.assessmentType}, ${data.maximumMarks},
         ${data.assessmentDate}, ${data.durationMinutes ?? null}, ${data.instructions})
      RETURNING *`;
    const assessment = rows[0]!;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'assessment', ${assessment.id}, 'Assessment created as draft')`;
    return assessment;
  });

export const updateAssessmentStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["draft", "published", "closed", "archived"]),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const sql = requireDatabase();
    const rows = await sql<AssessmentRow[]>`
      UPDATE hw_assessments SET status = ${data.status}, published_at = CASE WHEN ${data.status} = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END, closed_at = CASE WHEN ${data.status} = 'closed' THEN NOW() ELSE closed_at END
      WHERE id = ${data.id} AND school_id = ${context.schoolId} AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
      RETURNING *`;
    if (!rows[0]) throw new Error("Assessment not found or not authorized");
    if (data.status === "published") {
      await sql`
        INSERT INTO hw_calendar_events (school_id, title, description, event_type, starts_at, audience, created_by, source_entity, source_id)
        SELECT ${context.schoolId}, ${rows[0].title}, ${rows[0].instructions}, 'assessment', ${rows[0].assessment_date}::TIMESTAMPTZ, ARRAY['entire-school']::TEXT[], ${context.userId}, 'assessment', ${rows[0].id}
        WHERE NOT EXISTS (SELECT 1 FROM hw_calendar_events WHERE school_id = ${context.schoolId} AND source_entity = 'assessment' AND source_id = ${rows[0].id})`;
    }
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'assessment', ${data.id}, ${`Assessment status changed to ${data.status}`})`;
    return rows[0];
  });

export const addAssessmentQuestion = createServerFn({ method: "POST" })
  .validator(questionInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    if (
      data.questionType === "mcq" &&
      (data.options.length < 2 || !data.correctAnswer || !data.options.includes(data.correctAnswer))
    )
      throw new Error("MCQ questions require at least two options and a valid correct answer");
    if (data.questionType === "subjective" && data.correctAnswer)
      throw new Error("Subjective questions cannot expose a correct-answer field");
    const sql = requireDatabase();
    const rows = await sql<AssessmentQuestionRow[]>`
      INSERT INTO hw_assessment_questions (assessment_id, school_id, question_type, prompt, options, correct_answer, marks, answer_key, sort_order, created_by)
      SELECT ${data.assessmentId}, ${context.schoolId}, ${data.questionType}, ${data.prompt}, ${JSON.stringify(data.options)}::JSONB, ${data.correctAnswer ?? null}, ${data.marks}, ${data.answerKey ?? null}, ${data.sortOrder}, ${context.userId}
      WHERE EXISTS (SELECT 1 FROM hw_assessments WHERE id = ${data.assessmentId} AND school_id = ${context.schoolId} AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId}) AND status = 'draft')
      RETURNING *`;
    if (!rows[0]) throw new Error("Assessment not found, not a draft, or not authorized");
    return rows[0];
  });

export const listAssessmentQuestions = createServerFn({ method: "POST" })
  .validator(z.object({ assessmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const assessment = await sql<
      { status: string; class_id: string; academic_year_id: string; teacher_id: string }[]
    >`SELECT status, class_id, academic_year_id, teacher_id FROM hw_assessments WHERE id = ${data.assessmentId} AND school_id = ${context.schoolId}`;
    if (!assessment[0]) throw new Error("Assessment not found");
    if (
      isTeacherRole(context.role) &&
      (context.role !== "teacher" || assessment[0].teacher_id === context.userId)
    )
      return sql<
        AssessmentQuestionRow[]
      >`SELECT id, assessment_id, question_type, prompt, options, correct_answer, marks, answer_key, sort_order FROM hw_assessment_questions WHERE assessment_id = ${data.assessmentId} AND school_id = ${context.schoolId} ORDER BY sort_order, created_at`;
    if (context.role === "student") {
      const enrolled =
        await sql`SELECT 1 FROM hw_enrollments WHERE student_id = ${context.userId} AND class_id = ${assessment[0].class_id} AND academic_year_id = ${assessment[0].academic_year_id} AND school_id = ${context.schoolId}`;
      if (!enrolled[0] || assessment[0].status !== "published")
        throw new Error("Assessment is not available");
    } else if (context.role === "parent") {
      const linked =
        await sql`SELECT 1 FROM hw_enrollments e JOIN hw_parent_students ps ON ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE e.class_id = ${assessment[0].class_id} AND e.academic_year_id = ${assessment[0].academic_year_id} AND e.school_id = ${context.schoolId}`;
      if (!linked[0] || assessment[0].status !== "published")
        throw new Error("Assessment is not available");
    } else throw new Error("Permission denied");
    return sql<
      AssessmentQuestionRow[]
    >`SELECT id, assessment_id, question_type, prompt, options, NULL::TEXT AS correct_answer, marks, NULL::TEXT AS answer_key, sort_order FROM hw_assessment_questions WHERE assessment_id = ${data.assessmentId} AND school_id = ${context.schoolId} ORDER BY sort_order, created_at`;
  });

export const startAssessmentAttempt = createServerFn({ method: "POST" })
  .validator(z.object({ assessmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string; started_at: string; duration_minutes: number | null; status: string }[]
    >`
      INSERT INTO hw_assessment_attempts (assessment_id, school_id, student_id)
      SELECT a.id, a.school_id, ${context.userId} FROM hw_assessments a
      JOIN hw_enrollments e ON e.class_id = a.class_id AND e.academic_year_id = a.academic_year_id AND e.student_id = ${context.userId} AND e.school_id = ${context.schoolId}
      WHERE a.id = ${data.assessmentId} AND a.school_id = ${context.schoolId} AND a.status = 'published'
      ON CONFLICT (assessment_id, student_id) DO UPDATE SET status = CASE WHEN hw_assessment_attempts.status = 'submitted' THEN hw_assessment_attempts.status ELSE 'in_progress' END
      RETURNING id, started_at, status, (SELECT duration_minutes FROM hw_assessments WHERE id = assessment_id)`;
    if (!rows[0] || rows[0].status === "submitted") throw new Error("Assessment is unavailable");
    return rows[0];
  });

export const submitAssessmentAttempt = createServerFn({ method: "POST" })
  .validator(
    z.object({
      attemptId: z.string().min(1),
      answers: z
        .array(z.object({ questionId: z.string().min(1), response: z.string().max(5000) }))
        .max(500),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    const sql = requireDatabase();
    const attempt = await sql<
      {
        id: string;
        status: string;
        started_at: string;
        duration_minutes: number | null;
        assessment_id: string;
      }[]
    >`
      SELECT at.id, at.status, at.started_at, a.duration_minutes, at.assessment_id
      FROM hw_assessment_attempts at JOIN hw_assessments a ON a.id = at.assessment_id
      WHERE at.id = ${data.attemptId} AND at.school_id = ${context.schoolId} AND at.student_id = ${context.userId} AND a.status = 'published'`;
    const record = attempt[0];
    if (!record || record.status === "submitted")
      throw new Error("Assessment attempt is not available");
    if (
      record.duration_minutes &&
      Date.now() - new Date(record.started_at).getTime() > record.duration_minutes * 60_000
    )
      throw new Error("Assessment time limit has expired");
    await sql.begin(async (tx) => {
      for (const answer of data.answers) {
        await tx`INSERT INTO hw_assessment_answers (attempt_id, question_id, response) SELECT ${data.attemptId}, ${answer.questionId}, ${answer.response} WHERE EXISTS (SELECT 1 FROM hw_assessment_questions WHERE id = ${answer.questionId} AND assessment_id = ${record.assessment_id} AND school_id = ${context.schoolId}) ON CONFLICT (attempt_id, question_id) DO UPDATE SET response = EXCLUDED.response`;
      }
      await tx`UPDATE hw_assessment_attempts SET submitted_at = NOW(), status = 'submitted' WHERE id = ${data.attemptId} AND school_id = ${context.schoolId} AND student_id = ${context.userId}`;
    });
    return { ok: true as const, submittedAt: new Date().toISOString() };
  });

export const listGrades = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "teacher")
    return sql<
      GradeRow[]
    >`SELECT * FROM hw_grades WHERE school_id = ${context.schoolId} AND teacher_id = ${context.userId} ORDER BY created_at DESC LIMIT 1000`;
  if (["staff", "principal", "admin", "owner"].includes(context.role))
    return sql<
      GradeRow[]
    >`SELECT * FROM hw_grades WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 1000`;
  if (context.role === "student")
    return sql<
      GradeRow[]
    >`SELECT * FROM hw_grades WHERE school_id = ${context.schoolId} AND student_id = ${context.userId} AND publication_status = 'published' ORDER BY created_at DESC`;
  if (context.role === "parent")
    return sql<
      GradeRow[]
    >`SELECT g.* FROM hw_grades g JOIN hw_parent_students ps ON ps.student_id = g.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE g.school_id = ${context.schoolId} AND g.publication_status = 'published' ORDER BY g.created_at DESC`;
  return [] as GradeRow[];
});

const gradeInput = z
  .object({
    studentId: z.string().min(1),
    academicYearId: z.string().min(1),
    subjectId: z.string().max(80).optional(),
    subject: z.string().trim().min(2).max(120),
    assessmentId: z.string().min(1).optional(),
    homeworkId: z.string().min(1).optional(),
    maximumMarks: z.number().positive().max(10000),
    obtainedMarks: z.number().min(0).max(10000),
    grade: z.string().trim().max(20).optional(),
    feedback: z.string().trim().max(5000).default(""),
    publicationStatus: z.enum(["draft", "published"]).default("draft"),
  })
  .refine(
    (value) => value.assessmentId || value.homeworkId,
    "A grade must reference an assessment or homework",
  )
  .refine(
    (value) => value.obtainedMarks <= value.maximumMarks,
    "Obtained marks cannot exceed maximum marks",
  );

export const upsertGrade = createServerFn({ method: "POST" })
  .validator(gradeInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const marksError = validateMarks(data.maximumMarks, data.obtainedMarks);
    if (marksError) throw new Error(marksError);
    const sql = requireDatabase();
    const student =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}`;
    if (!student[0]) throw new Error("Student is not in this school");
    if (context.role === "teacher" && data.assessmentId) {
      const authorized =
        await sql`SELECT 1 FROM hw_assessments WHERE id = ${data.assessmentId} AND school_id = ${context.schoolId} AND teacher_id = ${context.userId}`;
      if (!authorized[0]) throw new Error("Teacher is not authorized for this assessment");
    }
    const percentage = Math.round((data.obtainedMarks / data.maximumMarks) * 10000) / 100;
    const rows = await sql<GradeRow[]>`
    INSERT INTO hw_grades (school_id, student_id, academic_year_id, subject_id, subject, teacher_id, assessment_id, homework_id, maximum_marks, obtained_marks, percentage, grade, feedback, publication_status, published_at)
    VALUES (${context.schoolId}, ${data.studentId}, ${data.academicYearId}, ${data.subjectId ?? null}, ${data.subject}, ${context.userId}, ${data.assessmentId ?? null}, ${data.homeworkId ?? null}, ${data.maximumMarks}, ${data.obtainedMarks}, ${percentage}, ${data.grade ?? null}, ${data.feedback}, ${data.publicationStatus}, CASE WHEN ${data.publicationStatus} = 'published' THEN NOW() ELSE NULL END)
    RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, ${data.publicationStatus === "published" ? "publish" : "edit"}, 'grade', ${rows[0]!.id}, 'Grade recorded with server-validated marks')`;
    return rows[0]!;
  });

export const publishGrade = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const sql = requireDatabase();
    const rows = await sql<
      GradeRow[]
    >`UPDATE hw_grades SET publication_status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = ${data.id} AND school_id = ${context.schoolId} AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId}) RETURNING *`;
    if (!rows[0]) throw new Error("Grade not found or not authorized");
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'publish', 'grade', ${data.id}, 'Grade published')`;
    return rows[0];
  });

export const generateReportCard = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      academicYearId: z.string().min(1),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      teacherFeedback: z.string().trim().max(5000).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const grades = await sql<
      {
        subject: string;
        subject_id: string | null;
        maximum_marks: number;
        obtained_marks: number;
        percentage: number;
        grade: string | null;
        feedback: string;
      }[]
    >`SELECT subject, subject_id, SUM(maximum_marks)::numeric AS maximum_marks, SUM(obtained_marks)::numeric AS obtained_marks, ROUND((SUM(obtained_marks) / NULLIF(SUM(maximum_marks), 0) * 100)::numeric, 2) AS percentage, NULL::TEXT AS grade, STRING_AGG(feedback, ' | ') AS feedback FROM hw_grades WHERE school_id = ${context.schoolId} AND student_id = ${data.studentId} AND academic_year_id = ${data.academicYearId} AND publication_status = 'published' GROUP BY subject, subject_id`;
    const max = grades.reduce((sum, row) => sum + Number(row.maximum_marks), 0);
    const obtained = grades.reduce((sum, row) => sum + Number(row.obtained_marks), 0);
    const overall = max ? Math.round((obtained / max) * 10000) / 100 : null;
    const attendance = await sql<
      { percentage: number | null }[]
    >`SELECT ROUND((COUNT(*) FILTER (WHERE status = 'present')::numeric / NULLIF(COUNT(*), 0) * 100), 2) AS percentage FROM hw_attendance WHERE school_id = ${context.schoolId} AND student_id = ${data.studentId}`;
    const reportRows = await sql<
      ReportCardRow[]
    >`INSERT INTO hw_report_cards (school_id, student_id, academic_year_id, class_id, section_id, overall_percentage, overall_grade, attendance_percentage, teacher_feedback, created_by) VALUES (${context.schoolId}, ${data.studentId}, ${data.academicYearId}, ${data.classId ?? null}, ${data.sectionId ?? null}, ${overall}, NULL, ${attendance[0]?.percentage ?? null}, ${data.teacherFeedback}, ${context.userId}) ON CONFLICT (student_id, academic_year_id) DO UPDATE SET class_id = EXCLUDED.class_id, section_id = EXCLUDED.section_id, overall_percentage = EXCLUDED.overall_percentage, attendance_percentage = EXCLUDED.attendance_percentage, teacher_feedback = EXCLUDED.teacher_feedback, created_by = EXCLUDED.created_by RETURNING *`;
    const report = reportRows[0]!;
    await sql`DELETE FROM hw_report_card_subjects WHERE report_card_id = ${report.id}`;
    for (const grade of grades)
      await sql`INSERT INTO hw_report_card_subjects (report_card_id, school_id, subject_id, subject, maximum_marks, obtained_marks, percentage, grade, teacher_feedback) VALUES (${report.id}, ${context.schoolId}, ${grade.subject_id}, ${grade.subject}, ${grade.maximum_marks}, ${grade.obtained_marks}, ${grade.percentage}, ${grade.grade}, ${grade.feedback})`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'report_card', ${report.id}, 'Report card calculated from published grades and attendance')`;
    return report;
  });

export const listReportCards = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (isStaffRole(context.role))
    return sql<
      ReportCardRow[]
    >`SELECT * FROM hw_report_cards WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 500`;
  if (context.role === "student")
    return sql<
      ReportCardRow[]
    >`SELECT * FROM hw_report_cards WHERE school_id = ${context.schoolId} AND student_id = ${context.userId} AND status = 'published' ORDER BY created_at DESC`;
  if (context.role === "parent")
    return sql<
      ReportCardRow[]
    >`SELECT r.* FROM hw_report_cards r JOIN hw_parent_students ps ON ps.student_id = r.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE r.school_id = ${context.schoolId} AND r.status = 'published' ORDER BY r.created_at DESC`;
  return [] as ReportCardRow[];
});

export const publishReportCard = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const rows = await sql<
      ReportCardRow[]
    >`UPDATE hw_report_cards SET status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = ${data.id} AND school_id = ${context.schoolId} RETURNING *`;
    if (!rows[0]) throw new Error("Report card not found or not authorized");
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'publish', 'report_card', ${data.id}, 'Report card published')`;
    return rows[0];
  });

const timetableInput = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().max(80).optional(),
  subject: z.string().trim().min(2).max(120),
  teacherId: z.string().min(1),
  room: z.string().trim().min(1).max(80),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const listTimetable = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (isStaffRole(context.role))
    return sql<
      TimetableRow[]
    >`SELECT * FROM hw_timetable_entries WHERE school_id = ${context.schoolId} ORDER BY weekday, start_time`;
  if (context.role === "student")
    return sql<
      TimetableRow[]
    >`SELECT t.* FROM hw_timetable_entries t JOIN hw_enrollments e ON e.class_id = t.class_id AND e.section_id = t.section_id AND e.academic_year_id = t.academic_year_id AND e.student_id = ${context.userId} WHERE t.school_id = ${context.schoolId} AND t.status = 'published' ORDER BY t.weekday, t.start_time`;
  if (context.role === "parent")
    return sql<
      TimetableRow[]
    >`SELECT DISTINCT t.* FROM hw_timetable_entries t JOIN hw_enrollments e ON e.class_id = t.class_id AND e.section_id = t.section_id AND e.academic_year_id = t.academic_year_id JOIN hw_parent_students ps ON ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE t.school_id = ${context.schoolId} AND t.status = 'published' ORDER BY t.weekday, t.start_time`;
  return [] as TimetableRow[];
});

export const createTimetableEntry = createServerFn({ method: "POST" })
  .validator(timetableInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    if (data.endTime <= data.startTime)
      throw new Error("Timetable end time must be after start time");
    const sql = requireDatabase();
    const conflict = await sql<{ id: string; reason: string }[]>`
    SELECT id, CASE WHEN teacher_id = ${data.teacherId} THEN 'Teacher is double-booked' WHEN room = ${data.room} THEN 'Classroom is double-booked' ELSE 'Section is double-booked' END AS reason
    FROM hw_timetable_entries
    WHERE school_id = ${context.schoolId} AND academic_year_id = ${data.academicYearId} AND weekday = ${data.weekday}
      AND start_time < ${data.endTime}::TIME AND end_time > ${data.startTime}::TIME
      AND (teacher_id = ${data.teacherId} OR room = ${data.room} OR (class_id = ${data.classId} AND section_id = ${data.sectionId})) LIMIT 1`;
    if (conflict[0]) throw new Error(conflict[0].reason);
    const rows = await sql<
      TimetableRow[]
    >`INSERT INTO hw_timetable_entries (school_id, academic_year_id, class_id, section_id, subject_id, subject, teacher_id, room, weekday, start_time, end_time, status) VALUES (${context.schoolId}, ${data.academicYearId}, ${data.classId}, ${data.sectionId}, ${data.subjectId ?? null}, ${data.subject}, ${data.teacherId}, ${data.room}, ${data.weekday}, ${data.startTime}, ${data.endTime}, ${data.status}) RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'timetable', ${rows[0]!.id}, 'Timetable entry created after conflict checks')`;
    return rows[0]!;
  });

export const deleteTimetableEntry = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const rows =
      await sql`DELETE FROM hw_timetable_entries WHERE id = ${data.id} AND school_id = ${context.schoolId} RETURNING id`;
    if (!rows[0]) throw new Error("Timetable entry not found");
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'delete', 'timetable', ${data.id}, 'Timetable entry deleted')`;
    return { ok: true as const };
  });

export const listSubstituteAssignments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, staffRoles);
  const sql = requireDatabase();
  return sql`SELECT * FROM hw_substitute_assignments WHERE school_id = ${context.schoolId} AND status <> 'cancelled' ORDER BY date DESC LIMIT 500`;
});

export const createSubstituteAssignment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      absentTeacherId: z.string().min(1),
      substituteTeacherId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      classId: z.string().min(1),
      sectionId: z.string().min(1),
      subjectId: z.string().max(80).optional(),
      subject: z.string().trim().min(2).max(120),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    if (data.absentTeacherId === data.substituteTeacherId)
      throw new Error("Substitute teacher must differ from absent teacher");
    const sql = requireDatabase();
    const availability =
      await sql`SELECT 1 FROM hw_teachers WHERE id = ${data.substituteTeacherId} AND school_id = ${context.schoolId} AND active = TRUE AND id <> ${data.absentTeacherId}`;
    if (!availability[0])
      throw new Error("Substitute teacher is not an active teacher in this school");
    const conflict =
      await sql`SELECT 1 FROM hw_substitute_assignments WHERE school_id = ${context.schoolId} AND date = ${data.date} AND substitute_teacher_id = ${data.substituteTeacherId} AND status <> 'cancelled'`;
    if (conflict[0]) throw new Error("Substitute teacher already has an assignment on this date");
    const rows =
      await sql`INSERT INTO hw_substitute_assignments (school_id, absent_teacher_id, substitute_teacher_id, date, class_id, section_id, subject_id, subject, created_by) VALUES (${context.schoolId}, ${data.absentTeacherId}, ${data.substituteTeacherId}, ${data.date}, ${data.classId}, ${data.sectionId}, ${data.subjectId ?? null}, ${data.subject}, ${context.userId}) RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'substitute', ${rows[0]!.id}, 'Substitute teacher assigned')`;
    return rows[0];
  });

export const getAcademicAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  const scope =
    context.role === "student"
      ? sql`AND s.student_id = ${context.userId}`
      : context.role === "parent"
        ? sql`AND EXISTS (SELECT 1 FROM hw_parent_students ps WHERE ps.student_id = s.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE)`
        : sql``;
  const homework = await sql<
    { total: number; completed: number }[]
  >`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded'))::int AS completed FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id WHERE s.school_id = ${context.schoolId} ${scope}`;
  const performance = await sql<
    { subject: string; average_percentage: number; graded_records: number }[]
  >`SELECT subject, ROUND(AVG(percentage), 2) AS average_percentage, COUNT(*)::int AS graded_records FROM hw_grades WHERE school_id = ${context.schoolId} AND publication_status = 'published' ${context.role === "student" ? sql`AND student_id = ${context.userId}` : context.role === "parent" ? sql`AND EXISTS (SELECT 1 FROM hw_parent_students ps WHERE ps.student_id = hw_grades.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE)` : sql``} GROUP BY subject ORDER BY average_percentage DESC`;
  const attendance = await sql<
    { date: string; present: number; total: number }[]
  >`SELECT date, COUNT(*) FILTER (WHERE status = 'present')::int AS present, COUNT(*)::int AS total FROM hw_attendance WHERE school_id = ${context.schoolId} ${context.role === "student" ? sql`AND student_id = ${context.userId}` : sql``} GROUP BY date ORDER BY date DESC LIMIT 90`;
  return {
    observed: true as const,
    homework: homework[0] ?? { total: 0, completed: 0 },
    performance,
    attendance,
  };
});

export const awardEngagement = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      activityKey: z.string().trim().min(2).max(100),
      sourceEntity: z.string().trim().min(2).max(80),
      sourceId: z.string().min(1),
      xp: z.number().int().positive().max(1000),
      badge: z.string().trim().max(80).optional(),
      metadata: z.record(z.unknown()).default({}),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, teacherRoles);
    const sql = requireDatabase();
    const validStudent =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}`;
    if (!validStudent[0]) throw new Error("Student not found in this school");
    const rows =
      await sql`INSERT INTO hw_engagement_awards (school_id, student_id, activity_key, source_entity, source_id, xp, badge, metadata) VALUES (${context.schoolId}, ${data.studentId}, ${data.activityKey}, ${data.sourceEntity}, ${data.sourceId}, ${data.xp}, ${data.badge ?? null}, ${JSON.stringify(data.metadata)}::JSONB) ON CONFLICT (school_id, student_id, activity_key, source_entity, source_id) DO NOTHING RETURNING *`;
    if (rows[0])
      await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'engagement_award', ${rows[0].id}, 'Idempotent engagement award created from actual activity')`;
    return { awarded: Boolean(rows[0]), record: rows[0] ?? null };
  });

export const listEngagement = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student")
    return sql`SELECT * FROM hw_engagement_awards WHERE school_id = ${context.schoolId} AND student_id = ${context.userId} ORDER BY awarded_at DESC`;
  if (context.role === "parent")
    return sql`SELECT e.* FROM hw_engagement_awards e JOIN hw_parent_students ps ON ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE WHERE e.school_id = ${context.schoolId} ORDER BY e.awarded_at DESC`;
  requireRole(context, staffRoles);
  return sql`SELECT * FROM hw_engagement_awards WHERE school_id = ${context.schoolId} ORDER BY awarded_at DESC LIMIT 1000`;
});
