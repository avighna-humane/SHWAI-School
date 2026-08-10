import { createServerFn } from '@tanstack/react-start';
import { CLASS_SECTIONS } from '@/data/mock/core';
import { TEACHERS } from '@/data/mock/people';

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
  const classOpts = CLASS_SECTIONS.map(c => ({
    value: `class-${c.grade}${c.section}`,
    label: c.label,
  }));

  if (role === 'teacher') {
    // Teachers can notify students, parents, or specific class sections — not all teachers or whole school
    return [
      { value: 'all-students', label: 'All Students' },
      { value: 'all-parents',  label: 'All Parents' },
      ...classOpts,
    ];
  }

  if (['principal', 'admin', 'owner'].includes(role)) {
    const teacherOpts = TEACHERS.map(t => ({
      value: `teacher-${t.id}`,
      label: t.name,
    }));
    return [
      { value: 'entire-school', label: 'Entire School' },
      { value: 'all-students',  label: 'All Students' },
      { value: 'all-teachers',  label: 'All Teachers' },
      { value: 'all-parents',   label: 'All Parents' },
      ...teacherOpts,
      ...classOpts,
    ];
  }

  return [];
}

/** Audience values a given role is allowed to include in a notice they create. */
function allowedAudienceValues(role: string): Set<string> {
  return new Set(getAudienceOptions(role).map(o => o.value));
}

function audienceMatchesRole(
  audience: string[],
  role: string,
  classId?: string,
  userId?: string,
): boolean {
  if (audience.includes('entire-school')) return true;
  if (role === 'student') {
    return audience.some(a =>
      a === 'all-students' ||
      (classId && a === `class-${classId.replace('cls-', '')}`)
    );
  }
  if (role === 'teacher') {
    // Sees notices to all-teachers OR notices targeted at them specifically
    return audience.some(a =>
      a === 'all-teachers' ||
      (userId && a === `teacher-${userId}`)
    );
  }
  if (role === 'principal' || role === 'admin' || role === 'owner') return true;
  if (role === 'parent') return audience.some(a => a === 'all-parents');
  return false;
}

export const listNotices = createServerFn({ method: 'POST' })
  .validator((d: { schoolId: string; role: string; userId: string; classId?: string }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    const rows = await sql<NoticeRow[]>`
      SELECT * FROM hw_notices WHERE school_id = ${data.schoolId} ORDER BY created_at DESC`;
    const reads = await sql<{ notice_id: string }[]>`
      SELECT notice_id FROM hw_notice_reads WHERE reader_id = ${data.userId}`;
    const readSet = new Set(reads.map(r => r.notice_id));

    // Teachers see: notices they authored + notices addressed to all-teachers
    // Students see: notices addressed to all-students or their class
    // Principal/admin/owner see all
    const { role } = data;
    let filtered: NoticeRow[];
    if (role === 'teacher') {
      filtered = rows.filter(n =>
        n.author_id === data.userId ||
        audienceMatchesRole(n.audience, data.role, data.classId, data.userId)
      );
    } else {
      filtered = rows.filter(n =>
        audienceMatchesRole(n.audience, data.role, data.classId, data.userId)
      );
    }
    return filtered.map(n => ({ ...n, is_read: readSet.has(n.id) })) as NoticeWithRead[];
  });

export const createNotice = createServerFn({ method: 'POST' })
  .validator((d: {
    schoolId: string; authorId: string; authorName: string; authorRole: string;
    title: string; content: string; audience: string[];
    attachmentName: string; attachmentData: string; role: string;
  }) => d)
  .handler(async ({ data }) => {
    if (!['principal', 'admin', 'owner'].includes(data.role))
      throw new Error('Permission denied');

    // Validate audience values against what this role is allowed to use
    const allowed = allowedAudienceValues(data.role);
    const invalid = data.audience.filter(a => !allowed.has(a));
    if (invalid.length > 0)
      throw new Error(`Not permitted to target: ${invalid.join(', ')}`);

    const { sql } = await import('@/lib/db');
    const rows = await sql<NoticeRow[]>`
      INSERT INTO hw_notices
        (school_id, author_id, author_name, author_role, title, content, audience, target_classes, attachment_name, attachment_data)
      VALUES
        (${data.schoolId}, ${data.authorId}, ${data.authorName}, ${data.authorRole},
         ${data.title}, ${data.content}, ${data.audience}, ${[] as string[]},
         ${data.attachmentName}, ${data.attachmentData})
      RETURNING *`;
    return rows[0]!;
  });

export const editNotice = createServerFn({ method: 'POST' })
  .validator((d: {
    id: string; authorId: string; role: string;
    title: string; content: string; audience: string[];
    attachmentName: string; attachmentData: string;
  }) => d)
  .handler(async ({ data }) => {
    if (!['principal', 'admin', 'owner'].includes(data.role))
      throw new Error('Permission denied');

    const allowed = allowedAudienceValues(data.role);
    const invalid = data.audience.filter(a => !allowed.has(a));
    if (invalid.length > 0)
      throw new Error(`Not permitted to target: ${invalid.join(', ')}`);

    const { sql } = await import('@/lib/db');
    await sql`
      UPDATE hw_notices
      SET title=${data.title}, content=${data.content}, audience=${data.audience},
          attachment_name=${data.attachmentName}, attachment_data=${data.attachmentData}
      WHERE id=${data.id}`;
    return { ok: true };
  });

export const markNoticeRead = createServerFn({ method: 'POST' })
  .validator((d: { noticeId: string; readerId: string }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    await sql`
      INSERT INTO hw_notice_reads (notice_id, reader_id)
      VALUES (${data.noticeId}, ${data.readerId})
      ON CONFLICT DO NOTHING`;
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: 'POST' })
  .validator((d: { id: string; authorId: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!['principal', 'admin', 'owner'].includes(data.role))
      throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    await sql`DELETE FROM hw_notices WHERE id=${data.id}`;
    return { ok: true };
  });
