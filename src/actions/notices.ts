import { createServerFn } from '@tanstack/react-start';

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
  created_at: string;
}

export interface NoticeWithRead extends NoticeRow {
  is_read: boolean;
}

export const AUDIENCE_OPTIONS = [
  { value: 'entire-school',  label: 'Entire School' },
  { value: 'all-students',   label: 'All Students' },
  { value: 'all-teachers',   label: 'All Teachers' },
  { value: 'all-parents',    label: 'All Parents' },
  { value: 'class-9A',       label: 'Grade 9 — A' },
  { value: 'class-9B',       label: 'Grade 9 — B' },
  { value: 'class-10A',      label: 'Grade 10 — A' },
  { value: 'class-10B',      label: 'Grade 10 — B' },
] as const;

function audienceMatchesRole(audience: string[], role: string, classId?: string): boolean {
  if (audience.includes('entire-school')) return true;
  if (role === 'student') return audience.some(a => a === 'all-students' || (classId && a === `class-${classId.replace('cls-', '')}`));
  if (role === 'teacher') return audience.some(a => a === 'all-teachers' || a === 'entire-school');
  if (role === 'principal' || role === 'admin') return true;
  if (role === 'parent') return audience.some(a => a === 'all-parents' || a === 'entire-school');
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
    return rows
      .filter(n => audienceMatchesRole(n.audience, data.role, data.classId))
      .map(n => ({ ...n, is_read: readSet.has(n.id) })) as NoticeWithRead[];
  });

export const createNotice = createServerFn({ method: 'POST' })
  .validator((d: {
    schoolId: string; authorId: string; authorName: string; authorRole: string;
    title: string; content: string; audience: string[]; targetClasses: string[];
    attachmentName: string; role: string;
  }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin', 'owner'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    const rows = await sql<NoticeRow[]>`
      INSERT INTO hw_notices
        (school_id, author_id, author_name, author_role, title, content, audience, target_classes, attachment_name)
      VALUES
        (${data.schoolId}, ${data.authorId}, ${data.authorName}, ${data.authorRole},
         ${data.title}, ${data.content}, ${data.audience}, ${data.targetClasses}, ${data.attachmentName})
      RETURNING *`;
    return rows[0]!;
  });

export const markNoticeRead = createServerFn({ method: 'POST' })
  .validator((d: { noticeId: string; readerId: string }) => d)
  .handler(async ({ data }) => {
    const { sql } = await import('@/lib/db');
    await sql`INSERT INTO hw_notice_reads (notice_id, reader_id) VALUES (${data.noticeId}, ${data.readerId}) ON CONFLICT DO NOTHING`;
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: 'POST' })
  .validator((d: { id: string; authorId: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!['teacher', 'principal', 'admin'].includes(data.role)) throw new Error('Permission denied');
    const { sql } = await import('@/lib/db');
    if (data.role === 'teacher') {
      await sql`DELETE FROM hw_notices WHERE id = ${data.id} AND author_id = ${data.authorId}`;
    } else {
      await sql`DELETE FROM hw_notices WHERE id = ${data.id}`;
    }
    return { ok: true };
  });
