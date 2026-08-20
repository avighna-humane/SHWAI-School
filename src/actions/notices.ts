import { createServerFn } from "@tanstack/react-start";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { TEACHERS } from "@/data/mock/people";
import { requireAuth, requireRole } from "@/lib/auth";
import { z } from "zod";

export interface NoticeRow {
  id: string;
  school_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  audience: string[];
  target_classes: string[];
  attachment_name: string;
  attachment_data: string;
  created_at: string;
}

export interface NoticeWithRead extends NoticeRow {
  is_read: boolean;
}

/** Returns audience options the given role is permitted to use when creating a notice. */
export function getAudienceOptions(role: string): { value: string; label: string }[] {
  const classOpts = CLASS_SECTIONS.map((c) => ({
    value: `class-${c.grade}${c.section}`,
    label: c.label,
  }));

  if (role === "teacher") {
    // Teachers can notify students, parents, or specific class sections — not all teachers or whole school
    return [
      { value: "all-students", label: "All Students" },
      { value: "all-parents", label: "All Parents" },
      ...classOpts,
    ];
  }

  if (["principal", "admin", "owner"].includes(role)) {
    const teacherOpts = TEACHERS.map((t) => ({
      value: `teacher-${t.id}`,
      label: t.name,
    }));
    return [
      { value: "entire-school", label: "Entire School" },
      { value: "all-students", label: "All Students" },
      { value: "all-teachers", label: "All Teachers" },
      { value: "all-parents", label: "All Parents" },
      ...teacherOpts,
      ...classOpts,
    ];
  }

  return [];
}

/** Audience values a given role is allowed to include in a notice they create. */
function allowedAudienceValues(role: string): Set<string> {
  return new Set(getAudienceOptions(role).map((o) => o.value));
}

function audienceMatchesRole(
  audience: string[],
  role: string,
  classId?: string,
  userId?: string,
): boolean {
  if (audience.includes("entire-school")) return true;
  if (role === "student") {
    return audience.some(
      (a) => a === "all-students" || (classId && a === `class-${classId.replace("cls-", "")}`),
    );
  }
  if (role === "teacher") {
    // Sees notices to all-teachers OR notices targeted at them specifically
    return audience.some((a) => a === "all-teachers" || (userId && a === `teacher-${userId}`));
  }
  if (role === "principal" || role === "admin" || role === "owner") return true;
  if (role === "parent") return audience.some((a) => a === "all-parents");
  return false;
}

export const listNotices = createServerFn({ method: "POST" })
  .validator(z.object({ classId: z.string().trim().min(1).max(160).optional() }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const { sql } = await import("@/lib/db");
    const rows = await sql<NoticeRow[]>`
      SELECT * FROM hw_notices WHERE school_id = ${context.schoolId} ORDER BY created_at DESC`;
    const reads = await sql<{ notice_id: string }[]>`
      SELECT notice_id FROM hw_notice_reads WHERE reader_id = ${context.userId}`;
    const linkedClasses = await sql<{ class_id: string }[]>`
      SELECT e.class_id FROM hw_enrollments e
      WHERE e.school_id = ${context.schoolId} AND (
        e.student_id = ${context.userId}
        OR EXISTS (SELECT 1 FROM hw_parent_students ps WHERE ps.school_id = e.school_id AND ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.active = TRUE)
      )
      ORDER BY e.status DESC LIMIT 1`;
    const effectiveClassId = data.classId ?? linkedClasses[0]?.class_id;
    const readSet = new Set(reads.map((r) => r.notice_id));

    // Teachers see: notices they authored + notices addressed to all-teachers
    // Students see: notices addressed to all-students or their class
    // Principal/admin/owner see all
    const role = context.role;
    let filtered: NoticeRow[];
    if (role === "teacher") {
      filtered = rows.filter(
        (n) =>
          n.author_id === context.userId ||
          audienceMatchesRole(n.audience, context.role, effectiveClassId, context.userId),
      );
    } else {
      filtered = rows.filter((n) =>
        audienceMatchesRole(n.audience, context.role, effectiveClassId, context.userId),
      );
    }
    return filtered.map((n) => ({ ...n, is_read: readSet.has(n.id) })) as NoticeWithRead[];
  });

export const createNotice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(2).max(160),
      content: z.string().trim().min(1).max(12000),
      audience: z.array(z.string().trim().min(1).max(160)).min(1).max(20),
      attachmentName: z.string().trim().max(180).default(""),
      attachmentData: z
        .string()
        .max(2_800_000)
        .refine(
          (value) => !value || /^[A-Za-z0-9+/]+={0,2}$/.test(value),
          "Attachment data is invalid",
        )
        .default(""),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    // Validate audience values against what this role is allowed to use
    const allowed = allowedAudienceValues(context.role);
    const invalid = data.audience.filter((a) => !allowed.has(a));
    if (invalid.length > 0) throw new Error(`Not permitted to target: ${invalid.join(", ")}`);

    const { sql } = await import("@/lib/db");
    const rows = await sql<NoticeRow[]>`
      INSERT INTO hw_notices
        (school_id, author_id, author_name, author_role, title, content, audience, target_classes, attachment_name, attachment_data)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role},
         ${data.title}, ${data.content}, ${data.audience}, ${[] as string[]},
         ${data.attachmentName}, ${data.attachmentData})
      RETURNING *`;
    const notice = rows[0]!;
    await sql`
      INSERT INTO hw_notifications (school_id, recipient_id, title, body, severity, source_entity, source_id, created_by)
      SELECT ${context.schoolId}, m.user_id, ${data.title}, ${data.content}, 'info', 'notice', ${notice.id}, ${context.userId}
      FROM hw_memberships m
      WHERE m.school_id = ${context.schoolId} AND m.active = TRUE AND m.user_id <> ${context.userId}
        AND (
          ${data.audience} && ARRAY['entire-school']::TEXT[]
          OR ('all-students' = ANY(${data.audience}) AND m.role = 'student')
          OR ('all-teachers' = ANY(${data.audience}) AND m.role = 'teacher')
          OR ('all-parents' = ANY(${data.audience}) AND m.role = 'parent')
        )`;
    return notice;
  });

export const editNotice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(1).max(160),
      title: z.string().trim().min(2).max(160),
      content: z.string().trim().min(1).max(12000),
      audience: z.array(z.string().trim().min(1).max(160)).min(1).max(20),
      attachmentName: z.string().trim().max(180).default(""),
      attachmentData: z
        .string()
        .max(2_800_000)
        .refine(
          (value) => !value || /^[A-Za-z0-9+/]+={0,2}$/.test(value),
          "Attachment data is invalid",
        )
        .default(""),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);

    const allowed = allowedAudienceValues(context.role);
    const invalid = data.audience.filter((a) => !allowed.has(a));
    if (invalid.length > 0) throw new Error(`Not permitted to target: ${invalid.join(", ")}`);

    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE hw_notices
      SET title=${data.title}, content=${data.content}, audience=${data.audience},
          attachment_name=${data.attachmentName}, attachment_data=${data.attachmentData}
      WHERE id=${data.id} AND school_id=${context.schoolId}`;
    return { ok: true };
  });

export const markNoticeRead = createServerFn({ method: "POST" })
  .validator(z.object({ noticeId: z.string().trim().min(1).max(160) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const { sql } = await import("@/lib/db");
    await sql`
      INSERT INTO hw_notice_reads (notice_id, reader_id)
      SELECT ${data.noticeId}, ${context.userId}
      WHERE EXISTS (SELECT 1 FROM hw_notices WHERE id = ${data.noticeId} AND school_id = ${context.schoolId})
      ON CONFLICT DO NOTHING`;
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().trim().min(1).max(160) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["principal", "admin", "owner"]);
    const { sql } = await import("@/lib/db");
    await sql`DELETE FROM hw_notices WHERE id=${data.id} AND school_id=${context.schoolId}`;
    return { ok: true };
  });
