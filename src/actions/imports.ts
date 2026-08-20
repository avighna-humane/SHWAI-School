import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requireFeatureEntitlement, requirePermission } from "@/lib/permissions";
import { consumeSecurityRateLimit } from "@/lib/security";

const entitySchema = z.enum(["students", "teachers", "parents"]);
const formatSchema = z.enum(["csv", "json", "xlsx"]);
const uploadSchema = z.object({
  entity: entitySchema,
  format: formatSchema,
  fileName: z.string().trim().min(1).max(180),
  fileSize: z.number().int().min(1).max(5_000_000),
  content: z.string().min(1).max(7_000_000),
  mapping: z.record(z.string()).default({}),
});

const canonicalStudentFields = [
  "name",
  "admissionNo",
  "dob",
  "gender",
  "guardianName",
  "guardianPhone",
  "classId",
  "sectionId",
  "academicYearId",
] as const;
type StudentField = (typeof canonicalStudentFields)[number];

type NormalizedStudent = {
  name: string;
  admissionNo: string;
  dob: string | null;
  gender: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  sectionId: string | null;
  academicYearId: string | null;
};

type ImportError = { row: number; field: string; message: string };

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value.length || row.length) {
    row.push(value.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const aliases: Record<StudentField, string[]> = {
  name: ["name", "studentname", "fullname", "student"],
  admissionNo: [
    "admissionno",
    "admissionnumber",
    "studentid",
    "rollno",
    "rollnumber",
    "studentnumber",
  ],
  dob: ["dob", "dateofbirth", "birthdate"],
  gender: ["gender", "sex"],
  guardianName: ["guardianname", "parentname", "fathername", "mothername"],
  guardianPhone: ["guardianphone", "parentphone", "fathermobile", "mothermobile", "phone"],
  classId: ["classid", "class", "grade"],
  sectionId: ["sectionid", "section"],
  academicYearId: ["academicyearid", "academicyear", "yearid"],
};

function parseRows(format: "csv" | "json", content: string) {
  if (format === "json") {
    const parsed: unknown = JSON.parse(content);
    if (
      !Array.isArray(parsed) ||
      parsed.some((row) => typeof row !== "object" || row === null || Array.isArray(row))
    )
      throw new Error("JSON import must be an array of objects");
    return parsed as Record<string, unknown>[];
  }
  const rows = parseCsv(content);
  const headers = rows.shift() ?? [];
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
}

function normalizeStudent(row: Record<string, unknown>, mapping: Record<string, string>) {
  const keys = Object.keys(row);
  const get = (field: StudentField) => {
    const requested = mapping[field];
    const key =
      requested && keys.includes(requested)
        ? requested
        : keys.find((candidate) => aliases[field]!.includes(normalizeHeader(candidate)));
    const value = key ? row[key] : undefined;
    return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  };
  return {
    name: get("name"),
    admissionNo: get("admissionNo"),
    dob: get("dob") || null,
    gender: get("gender") || null,
    guardianName: get("guardianName") || null,
    guardianPhone: get("guardianPhone") || null,
    classId: get("classId") || null,
    sectionId: get("sectionId") || null,
    academicYearId: get("academicYearId") || null,
  } satisfies NormalizedStudent;
}

function validateStudent(row: NormalizedStudent, rowNumber: number): ImportError[] {
  const errors: ImportError[] = [];
  if (!row.name || row.name.length < 2 || row.name.length > 120)
    errors.push({
      row: rowNumber,
      field: "name",
      message: "Name is required and must be 2–120 characters",
    });
  if (!row.admissionNo || row.admissionNo.length > 40)
    errors.push({
      row: rowNumber,
      field: "admissionNo",
      message: "Admission number is required and must be at most 40 characters",
    });
  if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob))
    errors.push({ row: rowNumber, field: "dob", message: "Date must use YYYY-MM-DD" });
  if (
    (row.classId || row.sectionId || row.academicYearId) &&
    (!row.classId || !row.sectionId || !row.academicYearId)
  )
    errors.push({
      row: rowNumber,
      field: "enrollment",
      message: "classId, sectionId, and academicYearId must be supplied together",
    });
  return errors;
}

export const createImportJob = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.import");
    requireFeatureEntitlement(context, "data_import");
    const sql = requireDatabase();
    await consumeSecurityRateLimit(sql, {
      scope: "import_school_user",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!data.fileName.toLowerCase().endsWith(`.${data.format}`))
      throw new Error("File extension does not match the declared format");
    if (data.format === "xlsx")
      throw new Error(
        "XLSX import requires the configured server-side workbook parser and object storage boundary",
      );
    const rawRows = parseRows(data.format, data.content);
    if (rawRows.length > 20_000) throw new Error("Import is limited to 20,000 staged rows per job");
    const normalizedRows =
      data.entity === "students" ? rawRows.map((row) => normalizeStudent(row, data.mapping)) : [];
    if (data.entity !== "students")
      throw new Error(
        "Only student imports are implemented; teacher and parent adapters remain configuration-required",
      );
    const errors = normalizedRows.flatMap((row, index) => validateStudent(row, index + 2));
    const duplicateAdmissionNumbers = new Set<string>();
    for (const [index, row] of normalizedRows.entries()) {
      if (duplicateAdmissionNumbers.has(row.admissionNo))
        errors.push({
          row: index + 2,
          field: "admissionNo",
          message: "Duplicate admission number in uploaded file",
        });
      duplicateAdmissionNumbers.add(row.admissionNo);
    }
    const validRows = normalizedRows.filter(
      (row, index) => !errors.some((error) => error.row === index + 2),
    );
    const jobRows = await sql<{ id: string }[]>`
      INSERT INTO hw_import_jobs (school_id, entity, format, status, file_name, file_size, mapping, summary, error_report, initiated_by)
      VALUES (${context.schoolId}, ${data.entity}, ${data.format}, ${errors.length ? "validated" : "reviewed"}, ${data.fileName}, ${data.fileSize}, ${JSON.stringify(data.mapping)}::JSONB,
        ${JSON.stringify({ total: normalizedRows.length, valid: validRows.length, warnings: 0, errors: errors.length })}::JSONB, ${JSON.stringify(errors)}::JSONB, ${context.userId}) RETURNING id`;
    const jobId = jobRows[0]!.id;
    for (const [index, row] of normalizedRows.entries()) {
      const rowErrors = errors.filter((error) => error.row === index + 2);
      await sql`
        INSERT INTO hw_import_rows (job_id, row_number, raw_data, normalized_data, status, errors)
        VALUES (${jobId}, ${index + 2}, ${JSON.stringify(rawRows[index])}::JSONB, ${JSON.stringify(row)}::JSONB, ${rowErrors.length ? "error" : "valid"}, ${JSON.stringify(rowErrors)}::JSONB)`;
    }
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'import_job', ${jobId}, ${`Staged ${data.entity} import: ${validRows.length} valid, ${errors.length} errors`})`;
    return {
      id: jobId,
      total: normalizedRows.length,
      valid: validRows.length,
      errors: errors.length,
      status: errors.length ? "validated" : "reviewed",
    };
  });

export const listImportJobs = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "data.import");
  const sql = requireDatabase();
  return sql`SELECT id, entity, format, status, file_name, file_size, summary, error_report, initiated_by, created_at, completed_at FROM hw_import_jobs WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 100`;
});

export const commitStudentImport = createServerFn({ method: "POST" })
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requirePermission(context, "data.import");
    requireFeatureEntitlement(context, "data_import");
    const sql = requireDatabase();
    const result = (await sql.begin(async (tx) => {
      const jobs = await tx<
        { id: string; status: string }[]
      >`SELECT id, status FROM hw_import_jobs WHERE id = ${data.jobId} AND school_id = ${context.schoolId} FOR UPDATE`;
      if (!jobs[0] || !["reviewed", "validated"].includes(jobs[0].status))
        throw new Error("Import job is not ready for commit");
      const rows = await tx<
        { normalized_data: NormalizedStudent; status: string }[]
      >`SELECT normalized_data, status FROM hw_import_rows WHERE job_id = ${data.jobId} ORDER BY row_number`;
      const validRows = rows.filter((row) => row.status === "valid");
      if (!validRows.length) throw new Error("Import has no valid rows to commit");
      for (const row of validRows) {
        const student = row.normalized_data;
        const duplicates =
          await tx`SELECT 1 FROM hw_students WHERE school_id = ${context.schoolId} AND admission_no = ${student.admissionNo} LIMIT 1`;
        if (duplicates[0])
          throw new Error(`Admission number already exists: ${student.admissionNo}`);
        const studentId = `stu-${crypto.randomUUID()}`;
        await tx`INSERT INTO hw_students (id, school_id, admission_no, name, dob, gender, guardian_name, guardian_phone) VALUES (${studentId}, ${context.schoolId}, ${student.admissionNo}, ${student.name}, ${student.dob}, ${student.gender}, ${student.guardianName}, ${student.guardianPhone})`;
        if (student.classId && student.sectionId && student.academicYearId) {
          const validEnrollment =
            await tx`SELECT 1 FROM hw_classes c JOIN hw_sections s ON s.class_id = c.id AND s.id = ${student.sectionId} AND s.school_id = c.school_id JOIN hw_academic_years y ON y.id = ${student.academicYearId} AND y.school_id = c.school_id WHERE c.id = ${student.classId} AND c.school_id = ${context.schoolId}`;
          if (!validEnrollment[0])
            throw new Error(`Invalid enrollment relationship for ${student.admissionNo}`);
          await tx`INSERT INTO hw_enrollments (school_id, student_id, academic_year_id, class_id, section_id) VALUES (${context.schoolId}, ${studentId}, ${student.academicYearId}, ${student.classId}, ${student.sectionId})`;
        }
      }
      await tx`UPDATE hw_import_rows SET status = CASE WHEN status = 'valid' THEN 'committed' ELSE status END WHERE job_id = ${data.jobId}`;
      await tx`UPDATE hw_import_jobs SET status = 'committed', completed_at = NOW() WHERE id = ${data.jobId}`;
      return { imported: validRows.length };
    })) as { imported: number };
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'import_commit', ${data.jobId}, ${`Committed ${result.imported} student records atomically`})`;
    return { ok: true as const, ...result };
  });
