import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { consumeSecurityRateLimit, validateSafeStorageKey } from "@/lib/security";
import {
  createPrivateObjectKey,
  deletePrivateObject,
  maxStorageObjectBytes,
  presignPrivateObject,
  requireStorage,
  scanPrivateObject,
  storageProviderState,
} from "@/lib/storage";

const staffRoles = ["staff", "teacher", "principal", "admin", "owner"] as const;
const leadershipRoles = ["principal", "admin", "owner"] as const;

export interface CalendarEventRow {
  id: string;
  school_id: string;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  audience: string[];
  created_by: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  school_id: string;
  title: string;
  category: string;
  storage_key: string | null;
  mime_type: string | null;
  size_bytes: number;
  audience: string[];
  created_by: string;
  created_at: string;
  scan_status?: string | null;
  original_name?: string | null;
}

export interface LeaveRow {
  id: string;
  school_id: string;
  requester_id: string;
  requester_role: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
}

const calendarInput = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  eventType: z.string().trim().min(2).max(50),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  audience: z.array(z.string().min(1)).min(1).max(20),
});

export const listCalendarEvents = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql<CalendarEventRow[]>`
    SELECT * FROM hw_calendar_events
    WHERE school_id = ${context.schoolId}
      AND (audience && ARRAY['entire-school', ${context.role}]::TEXT[])
    ORDER BY starts_at ASC LIMIT 500`;
});

export const createCalendarEvent = createServerFn({ method: "POST" })
  .validator(calendarInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<CalendarEventRow[]>`
      INSERT INTO hw_calendar_events
        (school_id, title, description, event_type, starts_at, ends_at, audience, created_by)
      VALUES
        (${context.schoolId}, ${data.title}, ${data.description}, ${data.eventType}, ${data.startsAt},
         ${data.endsAt ?? null}, ${data.audience}, ${context.userId})
      RETURNING *`;
    return rows[0]!;
  });

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  const audienceFilter = leadershipRoles.includes(context.role as (typeof leadershipRoles)[number])
    ? sql``
    : sql`AND (d.audience && ARRAY['entire-school', ${context.role}]::TEXT[] OR d.created_by = ${context.userId})`;
  return sql<DocumentRow[]>`
    SELECT d.*, so.scan_status, so.original_name
    FROM hw_documents d
    LEFT JOIN hw_storage_objects so ON so.document_id = d.id AND so.status = 'active'
    WHERE d.school_id = ${context.schoolId} ${audienceFilter}
    ORDER BY d.created_at DESC LIMIT 500`;
});

export const createDocumentMetadata = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(2).max(160),
      category: z.string().trim().min(2).max(50),
      storageKey: z.string().trim().max(500).optional(),
      mimeType: z.string().trim().max(120).optional(),
      sizeBytes: z.number().int().min(0).max(50_000_000).default(0),
      audience: z.array(z.string().min(1)).min(1).max(20),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const allowedMimeTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "text/plain",
    ]);
    const storageKey = data.storageKey ? validateSafeStorageKey(data.storageKey) : null;
    const mimeType = data.mimeType?.toLowerCase() ?? null;
    if (mimeType && !allowedMimeTypes.has(mimeType))
      throw new Error("Document MIME type is not allowed");
    if (storageKey && !mimeType) throw new Error("Document MIME type is required for stored files");
    const rows = await sql<DocumentRow[]>`
      INSERT INTO hw_documents
        (school_id, title, category, storage_key, mime_type, size_bytes, audience, created_by)
      VALUES
        (${context.schoolId}, ${data.title}, ${data.category}, ${storageKey}, ${mimeType}, ${data.sizeBytes}, ${data.audience}, ${context.userId})
      RETURNING *`;
    return rows[0]!;
  });

const documentUploadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(50),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().toLowerCase().max(120),
  sizeBytes: z.number().int().min(1).max(50_000_000),
  audience: z.array(z.string().min(1)).min(1).max(20),
});

const documentIdSchema = z.object({ id: z.string().uuid() });

const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
]);

export const createDocumentUpload = createServerFn({ method: "POST" })
  .validator(documentUploadSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    if (!allowedDocumentMimeTypes.has(data.mimeType))
      throw new Error("Document MIME type is not allowed");
    if (data.fileName.includes("/") || data.fileName.includes("\\"))
      throw new Error("Document filename is invalid");
    if (data.sizeBytes > maxStorageObjectBytes())
      throw new Error("Document exceeds the 50 MB limit");
    requireStorage();
    const sql = requireDatabase();
    await consumeSecurityRateLimit(sql, {
      scope: "document_upload",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const storageKey = createPrivateObjectKey(context.schoolId, data.fileName);
    const documentRows = await sql<DocumentRow[]>`
      INSERT INTO hw_documents
        (school_id, title, category, storage_key, mime_type, size_bytes, audience, created_by)
      VALUES
        (${context.schoolId}, ${data.title}, ${data.category}, ${storageKey}, ${data.mimeType}, ${data.sizeBytes}, ${data.audience}, ${context.userId})
      RETURNING *`;
    const document = documentRows[0]!;
    const objectRows = await sql<{ id: string }[]>`
      INSERT INTO hw_storage_objects
        (school_id, document_id, storage_key, original_name, mime_type, size_bytes, scan_status, status, created_by)
      VALUES
        (${context.schoolId}, ${document.id}, ${storageKey}, ${data.fileName}, ${data.mimeType}, ${data.sizeBytes}, 'pending', 'active', ${context.userId})
      RETURNING id`;
    const signed = presignPrivateObject({
      operation: "PUT",
      key: storageKey,
      contentType: data.mimeType,
    });
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'document_upload_started', 'document', ${document.id}, 'Created a private signed upload; object remains unavailable until scanning passes')`;
    return {
      documentId: document.id,
      storageObjectId: objectRows[0]!.id,
      uploadUrl: signed.url,
      expiresInSeconds: signed.expiresInSeconds,
    };
  });

export const completeDocumentUpload = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      checksumSha256: z
        .string()
        .regex(/^[a-f0-9]{64}$/i)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<{ id: string; storage_key: string; scan_status: string }[]>`
      SELECT o.id, o.storage_key, o.scan_status
      FROM hw_storage_objects o
      JOIN hw_documents d ON d.id = o.document_id AND d.school_id = o.school_id
      WHERE o.id = ${data.id} AND o.school_id = ${context.schoolId} AND o.status = 'active'`;
    const object = rows[0];
    if (!object) throw new Error("Storage object not found");
    const scanStatus = await scanPrivateObject({
      key: object.storage_key,
      checksumSha256: data.checksumSha256 ?? "",
    });
    await sql`UPDATE hw_storage_objects SET checksum_sha256 = ${data.checksumSha256 ?? ""}, scan_status = ${scanStatus} WHERE id = ${object.id} AND school_id = ${context.schoolId}`;
    return { storageObjectId: object.id, scanStatus, downloadable: scanStatus === "clean" };
  });

export const getDocumentDownloadUrl = createServerFn({ method: "POST" })
  .validator(documentIdSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const audienceFilter = leadershipRoles.includes(
      context.role as (typeof leadershipRoles)[number],
    )
      ? sql``
      : sql`AND (d.audience && ARRAY['entire-school', ${context.role}]::TEXT[] OR d.created_by = ${context.userId})`;
    const rows = await sql<
      {
        id: string;
        storage_key: string;
        original_name: string;
        scan_status: string;
        status: string;
      }[]
    >`
      SELECT d.id, o.storage_key, o.original_name, o.scan_status, o.status
      FROM hw_documents d
      JOIN hw_storage_objects o ON o.document_id = d.id AND o.school_id = d.school_id
      WHERE d.id = ${data.id} AND d.school_id = ${context.schoolId} AND o.status = 'active' ${audienceFilter}`;
    const document = rows[0];
    if (!document) throw new Error("Document not found or not authorized");
    if (document.scan_status !== "clean")
      throw new Error("Document is unavailable until malware scanning passes");
    if (storageProviderState().status !== "configured")
      throw new Error("Private storage is not configured");
    await consumeSecurityRateLimit(sql, {
      scope: "document_download",
      subject: `${context.schoolId}:${context.userId}`,
      limit: 60,
      windowSeconds: 60 * 60,
    });
    const signed = presignPrivateObject({ operation: "GET", key: document.storage_key });
    await sql`
      INSERT INTO hw_data_access_logs (school_id, actor_id, actor_role, action, entity, entity_id, fields, reason)
      VALUES (${context.schoolId}, ${context.userId}, ${context.role}, 'download', 'document', ${document.id}, ARRAY['private_object'], 'Audience-authorized signed document download')`;
    return {
      url: signed.url,
      fileName: document.original_name,
      expiresInSeconds: signed.expiresInSeconds,
    };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator(documentIdSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<{ id: string; storage_key: string }[]>`
      SELECT o.id, o.storage_key FROM hw_storage_objects o
      JOIN hw_documents d ON d.id = o.document_id AND d.school_id = o.school_id
      WHERE d.id = ${data.id} AND d.school_id = ${context.schoolId} AND o.status = 'active'`;
    const object = rows[0];
    if (!object) throw new Error("Document not found or already deleted");
    requireStorage();
    await deletePrivateObject(object.storage_key);
    await sql`UPDATE hw_storage_objects SET status = 'deleted', deleted_at = NOW() WHERE id = ${object.id} AND school_id = ${context.schoolId}`;
    await sql`UPDATE hw_documents SET storage_key = NULL, mime_type = NULL, size_bytes = 0 WHERE id = ${data.id} AND school_id = ${context.schoolId}`;
    await sql`
      INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'document_deleted', 'document', ${data.id}, 'Deleted private object and retained metadata audit boundary')`;
    return { ok: true as const };
  });

const leaveInput = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(2).max(1000),
});

export const createLeaveRequest = createServerFn({ method: "POST" })
  .validator(leaveInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    if (data.endDate < data.startDate)
      throw new Error("Leave end date must be on or after the start date");
    const rows = await sql<LeaveRow[]>`
      INSERT INTO hw_leave_requests
        (school_id, requester_id, requester_role, start_date, end_date, reason)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.role}, ${data.startDate}, ${data.endDate}, ${data.reason})
      RETURNING *`;
    return rows[0]!;
  });

export const listLeaveRequests = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (staffRoles.includes(context.role as (typeof staffRoles)[number])) {
    return sql<LeaveRow[]>`
      SELECT * FROM hw_leave_requests WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 500`;
  }
  return sql<LeaveRow[]>`
    SELECT * FROM hw_leave_requests WHERE school_id = ${context.schoolId} AND requester_id = ${context.userId} ORDER BY created_at DESC`;
});

export const reviewLeaveRequest = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), status: z.enum(["approved", "rejected"]) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const rows = await sql<LeaveRow[]>`
      UPDATE hw_leave_requests
      SET status = ${data.status}, reviewed_by = ${context.userId}
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
      RETURNING *`;
    if (!rows[0]) throw new Error("Leave request not found or not authorized");
    return rows[0];
  });

export const generateStudentIdCard = createServerFn({ method: "POST" })
  .validator(z.object({ studentId: z.string().min(1), academicYearId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<
      {
        id: string;
        student_id: string;
        student_name: string;
        admission_no: string;
        school_name: string;
        class_label: string | null;
        section_name: string | null;
        academic_year_label: string;
      }[]
    >`
      WITH card AS (
        INSERT INTO hw_id_cards (school_id, student_id, academic_year_id, generated_by)
        SELECT ${context.schoolId}, ${data.studentId}, ${data.academicYearId}, ${context.userId}
        WHERE EXISTS (SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId})
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET generated_by = EXCLUDED.generated_by, created_at = NOW()
        RETURNING id, student_id
      )
      SELECT card.id, st.id AS student_id, st.name AS student_name, st.admission_no, school.name AS school_name,
             cls.label AS class_label, sec.name AS section_name, ay.label AS academic_year_label
      FROM card
      JOIN hw_students st ON st.id = card.student_id
      JOIN hw_schools school ON school.id = st.school_id
      LEFT JOIN hw_enrollments e ON e.student_id = st.id AND e.academic_year_id = ${data.academicYearId}
      LEFT JOIN hw_classes cls ON cls.id = e.class_id
      LEFT JOIN hw_sections sec ON sec.id = e.section_id
      JOIN hw_academic_years ay ON ay.id = ${data.academicYearId} AND ay.school_id = ${context.schoolId}`;
    if (!rows[0]) throw new Error("Student or academic year not found in this school");
    return rows[0];
  });

export const transitionToAlumni = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      graduationYearId: z.string().min(1),
      graduationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      destination: z.string().trim().max(200).optional(),
      notes: z.string().trim().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    await sql.begin(async (tx) => {
      const updated = await tx<{ id: string }[]>`
        UPDATE hw_students SET status = 'alumni', updated_at = NOW()
        WHERE id = ${data.studentId} AND school_id = ${context.schoolId}
        RETURNING id`;
      if (!updated[0]) throw new Error("Student not found or not authorized");
      await tx`
        INSERT INTO hw_alumni (student_id, school_id, graduation_year_id, graduation_date, destination, notes)
        VALUES (${data.studentId}, ${context.schoolId}, ${data.graduationYearId}, ${data.graduationDate}, ${data.destination ?? null}, ${data.notes ?? ""})
        ON CONFLICT (student_id) DO UPDATE SET graduation_year_id = EXCLUDED.graduation_year_id, graduation_date = EXCLUDED.graduation_date, destination = EXCLUDED.destination, notes = EXCLUDED.notes`;
      await tx`
        INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
        VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'alumni', ${data.studentId}, 'Student transitioned to alumni without deleting historical records')`;
    });
    return { ok: true as const };
  });
