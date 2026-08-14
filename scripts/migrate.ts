import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";
if (!DB_URL) {
  console.error("DATABASE_URL or SUPABASE_DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { ssl: DB_URL.includes("supabase") ? "require" : undefined });

async function migrate() {
  console.log("Running SHWAI schema migration...");

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_homework (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_id TEXT NOT NULL,
      class_label TEXT NOT NULL,
      section TEXT DEFAULT '',
      description TEXT DEFAULT '',
      due_date DATE NOT NULL,
      total_marks INTEGER DEFAULT 0,
      reference_material TEXT DEFAULT '',
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      homework_id UUID REFERENCES hw_homework(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      school_id TEXT NOT NULL,
      status TEXT DEFAULT 'submitted',
      comment TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      file_type TEXT DEFAULT '',
      file_data TEXT DEFAULT '',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      grade INTEGER,
      feedback TEXT DEFAULT '',
      UNIQUE(homework_id, student_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      audience TEXT[] NOT NULL DEFAULT '{}',
      target_classes TEXT[] DEFAULT '{}',
      attachment_name TEXT DEFAULT '',
      attachment_data TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_notice_reads (
      notice_id UUID REFERENCES hw_notices(id) ON DELETE CASCADE,
      reader_id TEXT NOT NULL,
      read_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (notice_id, reader_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
      marked_by TEXT NOT NULL,
      marked_at TIMESTAMPTZ DEFAULT NOW(),
      synced BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (school_id, student_id, date)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS hw_attendance_school_date_idx ON hw_attendance (school_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_audit_school_created_idx ON hw_audit_events (school_id, created_at DESC)`;

  console.log("Migration complete!");
  await sql.end();
}

migrate().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exitCode = 1;
});
