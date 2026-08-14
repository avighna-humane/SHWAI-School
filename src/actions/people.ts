import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";

export interface StudentRecord {
  id: string;
  school_id: string;
  user_id: string | null;
  admission_no: string;
  name: string;
  dob: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  status: "active" | "inactive" | "alumni";
  class_id: string | null;
  class_label: string | null;
  section_id: string | null;
  section_name: string | null;
  academic_year_id: string | null;
  academic_year_label: string | null;
}

const listInput = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive", "alumni"]).default("active"),
});
const studentInput = z.object({
  admissionNo: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  gender: z.string().trim().max(40).optional(),
  guardianName: z.string().trim().max(120).optional(),
  guardianPhone: z.string().trim().max(40).optional(),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  academicYearId: z.string().min(1),
});
const updateInput = studentInput.extend({ id: z.string().min(1) });

const staffRoles = ["staff", "principal", "admin", "owner"] as const;

export const listStudents = createServerFn({ method: "POST" })
  .validator(listInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const search = `%${data.search ?? ""}%`;

    if (context.role === "student") {
      return sql<StudentRecord[]>`
        SELECT st.*, c.label AS class_label, s.name AS section_name,
               e.class_id, e.section_id, e.academic_year_id, ay.label AS academic_year_label
        FROM hw_students st
        LEFT JOIN hw_enrollments e ON e.student_id = st.id AND e.status = 'active'
        LEFT JOIN hw_classes c ON c.id = e.class_id
        LEFT JOIN hw_sections s ON s.id = e.section_id
        LEFT JOIN hw_academic_years ay ON ay.id = e.academic_year_id
        WHERE st.school_id = ${context.schoolId} AND st.user_id = ${context.userId}
        LIMIT 1`;
    }

    if (context.role === "parent") {
      return sql<StudentRecord[]>`
        SELECT st.*, c.label AS class_label, s.name AS section_name,
               e.class_id, e.section_id, e.academic_year_id, ay.label AS academic_year_label
        FROM hw_parent_students ps
        JOIN hw_parents p ON p.id = ps.parent_id AND p.user_id = ${context.userId}
        JOIN hw_students st ON st.id = ps.student_id
        LEFT JOIN hw_enrollments e ON e.student_id = st.id AND e.status = 'active'
        LEFT JOIN hw_classes c ON c.id = e.class_id
        LEFT JOIN hw_sections s ON s.id = e.section_id
        LEFT JOIN hw_academic_years ay ON ay.id = e.academic_year_id
        WHERE ps.school_id = ${context.schoolId} AND ps.active = TRUE AND st.status = ${data.status}
          AND (st.name ILIKE ${search} OR st.admission_no ILIKE ${search})
        ORDER BY st.name`;
    }

    requireRole(context, [...staffRoles, "teacher"]);
    if (context.role === "teacher") {
      return sql<StudentRecord[]>`
        SELECT DISTINCT st.*, c.label AS class_label, s.name AS section_name,
               e.class_id, e.section_id, e.academic_year_id, ay.label AS academic_year_label
        FROM hw_teacher_assignments ta
        JOIN hw_teachers t ON t.id = ta.teacher_id AND t.user_id = ${context.userId}
        JOIN hw_enrollments e ON e.class_id = ta.class_id AND e.school_id = ${context.schoolId} AND e.status = 'active'
        JOIN hw_students st ON st.id = e.student_id
        LEFT JOIN hw_classes c ON c.id = e.class_id
        LEFT JOIN hw_sections s ON s.id = e.section_id
        LEFT JOIN hw_academic_years ay ON ay.id = e.academic_year_id
        WHERE st.status = ${data.status}
          AND (st.name ILIKE ${search} OR st.admission_no ILIKE ${search})
        ORDER BY st.name LIMIT 500`;
    }

    return sql<StudentRecord[]>`
      SELECT st.*, c.label AS class_label, s.name AS section_name,
             e.class_id, e.section_id, e.academic_year_id, ay.label AS academic_year_label
      FROM hw_students st
      LEFT JOIN hw_enrollments e ON e.student_id = st.id AND e.status = 'active'
      LEFT JOIN hw_classes c ON c.id = e.class_id
      LEFT JOIN hw_sections s ON s.id = e.section_id
      LEFT JOIN hw_academic_years ay ON ay.id = e.academic_year_id
      WHERE st.school_id = ${context.schoolId} AND st.status = ${data.status}
        AND (st.name ILIKE ${search} OR st.admission_no ILIKE ${search})
      ORDER BY st.name LIMIT 500`;
  });

export const createStudent = createServerFn({ method: "POST" })
  .validator(studentInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const studentId = `stu-${crypto.randomUUID()}`;
    const rows = await sql<StudentRecord[]>`
      WITH valid_section AS (
        SELECT sec.id, sec.class_id
        FROM hw_sections sec
        JOIN hw_classes cls ON cls.id = sec.class_id AND cls.school_id = ${context.schoolId}
        JOIN hw_academic_years ay ON ay.id = ${data.academicYearId} AND ay.school_id = ${context.schoolId}
        WHERE sec.id = ${data.sectionId} AND sec.class_id = ${data.classId}
      ), inserted AS (
        INSERT INTO hw_students (id, school_id, admission_no, name, dob, gender, guardian_name, guardian_phone)
        SELECT ${studentId}, ${context.schoolId}, ${data.admissionNo}, ${data.name}, ${data.dob ?? null},
               ${data.gender ?? null}, ${data.guardianName ?? null}, ${data.guardianPhone ?? null}
        WHERE EXISTS (SELECT 1 FROM valid_section)
        RETURNING *
      )
      SELECT inserted.*, ${data.classId} AS class_id, NULL::TEXT AS class_label,
             ${data.sectionId} AS section_id, NULL::TEXT AS section_name,
             ${data.academicYearId} AS academic_year_id, NULL::TEXT AS academic_year_label
      FROM inserted`;
    if (!rows[0]) throw new Error("Class, section or academic year is invalid for this school");
    await sql`
      INSERT INTO hw_enrollments (school_id, student_id, academic_year_id, class_id, section_id)
      VALUES (${context.schoolId}, ${studentId}, ${data.academicYearId}, ${data.classId}, ${data.sectionId})`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'student', ${studentId}, 'Student record created')`;
    return rows[0];
  });

export const updateStudent = createServerFn({ method: "POST" })
  .validator(updateInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows = await sql<StudentRecord[]>`
      UPDATE hw_students
      SET name = ${data.name}, admission_no = ${data.admissionNo}, dob = ${data.dob ?? null},
          gender = ${data.gender ?? null}, guardian_name = ${data.guardianName ?? null},
          guardian_phone = ${data.guardianPhone ?? null}, updated_at = NOW()
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
      RETURNING *`;
    if (!rows[0]) throw new Error("Student not found or not authorized");
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'student', ${data.id}, 'Student record updated')`;
    return rows[0];
  });

export const archiveStudent = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows = await sql<{ id: string }[]>`
      UPDATE hw_students SET status = 'inactive', updated_at = NOW()
      WHERE id = ${data.id} AND school_id = ${context.schoolId} AND status = 'active'
      RETURNING id`;
    if (!rows[0]) throw new Error("Student not found or already archived");
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'delete', 'student', ${data.id}, 'Student archived')`;
    return { ok: true as const };
  });

export const promoteStudent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      academicYearId: z.string().min(1),
      classId: z.string().min(1),
      sectionId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    await sql`
      INSERT INTO hw_enrollments (school_id, student_id, academic_year_id, class_id, section_id)
      SELECT ${context.schoolId}, ${data.studentId}, ${data.academicYearId}, ${data.classId}, ${data.sectionId}
      WHERE EXISTS (SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId})
        AND EXISTS (SELECT 1 FROM hw_classes WHERE id = ${data.classId} AND school_id = ${context.schoolId})
        AND EXISTS (SELECT 1 FROM hw_sections WHERE id = ${data.sectionId} AND class_id = ${data.classId} AND school_id = ${context.schoolId})
        AND EXISTS (SELECT 1 FROM hw_academic_years WHERE id = ${data.academicYearId} AND school_id = ${context.schoolId})`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'enrollment', ${data.studentId}, ${`Promotion into academic year ${data.academicYearId}`})`;
    return { ok: true as const };
  });

const personInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(40).optional(),
});
const teacherInput = personInput.extend({ employeeId: z.string().trim().min(1).max(40) });
const staffInput = personInput.extend({
  designation: z.string().trim().min(2).max(120),
  department: z.string().trim().max(120).optional(),
});
const parentInput = personInput;
const academicYearInput = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(4).max(40),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["planned", "active", "closed"]),
});
const classInput = z.object({
  id: z.string().trim().min(1).max(40),
  grade: z.number().int().min(1).max(12),
  label: z.string().trim().min(1).max(40),
});
const sectionInput = z.object({
  id: z.string().trim().min(1).max(40),
  classId: z.string().min(1),
  name: z.string().trim().min(1).max(20),
});
const subjectInput = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
});

export const listTeachers = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, ["teacher", "staff", "principal", "admin", "owner"]);
  const sql = requireDatabase();
  return sql`SELECT * FROM hw_teachers WHERE school_id = ${context.schoolId} AND active = TRUE ORDER BY name`;
});

export const createTeacher = createServerFn({ method: "POST" })
  .validator(teacherInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const teacherId = `tch-${crypto.randomUUID()}`;
    const rows =
      await sql`INSERT INTO hw_teachers (id, school_id, employee_id, name, email, phone) VALUES (${teacherId}, ${context.schoolId}, ${data.employeeId}, ${data.name}, ${data.email ?? null}, ${data.phone ?? null}) RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'teacher', ${teacherId}, 'Teacher record created')`;
    return rows[0];
  });

export const listParents = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, ["parent", "teacher", "staff", "principal", "admin", "owner"]);
  const sql = requireDatabase();
  return sql`SELECT * FROM hw_parents WHERE school_id = ${context.schoolId} AND active = TRUE ORDER BY name`;
});

export const createParent = createServerFn({ method: "POST" })
  .validator(parentInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const parentId = `par-${crypto.randomUUID()}`;
    const rows =
      await sql`INSERT INTO hw_parents (id, school_id, name, email, phone) VALUES (${parentId}, ${context.schoolId}, ${data.name}, ${data.email ?? null}, ${data.phone ?? null}) RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'parent', ${parentId}, 'Parent record created')`;
    return rows[0];
  });

export const createStaff = createServerFn({ method: "POST" })
  .validator(staffInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const staffId = `stf-${crypto.randomUUID()}`;
    const rows =
      await sql`INSERT INTO hw_staff (id, school_id, name, designation, department) VALUES (${staffId}, ${context.schoolId}, ${data.name}, ${data.designation}, ${data.department ?? null}) RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'staff', ${staffId}, 'Staff record created')`;
    return rows[0];
  });

export const listAcademicYears = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql`SELECT * FROM hw_academic_years WHERE school_id = ${context.schoolId} ORDER BY start_date DESC`;
});

export const createAcademicYear = createServerFn({ method: "POST" })
  .validator(academicYearInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows =
      await sql`INSERT INTO hw_academic_years (id, school_id, label, start_date, end_date, status) VALUES (${data.id}, ${context.schoolId}, ${data.label}, ${data.startDate}, ${data.endDate}, ${data.status}) RETURNING *`;
    return rows[0];
  });

export const createClass = createServerFn({ method: "POST" })
  .validator(classInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows =
      await sql`INSERT INTO hw_classes (id, school_id, grade, label) VALUES (${data.id}, ${context.schoolId}, ${data.grade}, ${data.label}) RETURNING *`;
    return rows[0];
  });

export const createSection = createServerFn({ method: "POST" })
  .validator(sectionInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows =
      await sql`INSERT INTO hw_sections (id, school_id, class_id, name) SELECT ${data.id}, ${context.schoolId}, ${data.classId}, ${data.name} WHERE EXISTS (SELECT 1 FROM hw_classes WHERE id = ${data.classId} AND school_id = ${context.schoolId}) RETURNING *`;
    if (!rows[0]) throw new Error("Class not found in this school");
    return rows[0];
  });

export const createSubject = createServerFn({ method: "POST" })
  .validator(subjectInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    const rows =
      await sql`INSERT INTO hw_subjects (id, school_id, name) VALUES (${data.id}, ${context.schoolId}, ${data.name}) RETURNING *`;
    return rows[0];
  });

export const linkParentStudent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      parentId: z.string().min(1),
      studentId: z.string().min(1),
      relation: z.string().trim().min(2).max(40),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    await sql`INSERT INTO hw_parent_students (parent_id, student_id, school_id, relation) SELECT ${data.parentId}, ${data.studentId}, ${context.schoolId}, ${data.relation} WHERE EXISTS (SELECT 1 FROM hw_parents WHERE id = ${data.parentId} AND school_id = ${context.schoolId}) AND EXISTS (SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}) ON CONFLICT (parent_id, student_id) DO UPDATE SET relation = EXCLUDED.relation, active = TRUE`;
    return { ok: true as const };
  });

export const assignTeacher = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherId: z.string().min(1),
      classId: z.string().min(1),
      subjectId: z.string().min(1),
      academicYearId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const sql = requireDatabase();
    await sql`INSERT INTO hw_teacher_assignments (teacher_id, class_id, subject_id, school_id, academic_year_id) SELECT ${data.teacherId}, ${data.classId}, ${data.subjectId}, ${context.schoolId}, ${data.academicYearId} WHERE EXISTS (SELECT 1 FROM hw_teachers WHERE id = ${data.teacherId} AND school_id = ${context.schoolId}) AND EXISTS (SELECT 1 FROM hw_classes WHERE id = ${data.classId} AND school_id = ${context.schoolId}) AND EXISTS (SELECT 1 FROM hw_subjects WHERE id = ${data.subjectId} AND school_id = ${context.schoolId}) ON CONFLICT DO NOTHING`;
    return { ok: true as const };
  });
