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
    CREATE TABLE IF NOT EXISTS hw_schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES hw_users(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'staff', 'admin', 'principal', 'owner')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, school_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES hw_users(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      membership_id UUID NOT NULL REFERENCES hw_memberships(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS hw_memberships_school_idx ON hw_memberships (school_id, role)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_sessions_expiry_idx ON hw_sessions (expires_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_academic_years (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'closed')),
      UNIQUE (school_id, label)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
      label TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (school_id, label)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_sections (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (class_id, name)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_subjects (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (school_id, name)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_students (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES hw_users(id) ON DELETE SET NULL,
      admission_no TEXT NOT NULL,
      name TEXT NOT NULL,
      dob DATE,
      gender TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (school_id, admission_no)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_teachers (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES hw_users(id) ON DELETE SET NULL,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (school_id, employee_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_parents (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES hw_users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_staff (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES hw_users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_parent_students (
      parent_id TEXT NOT NULL REFERENCES hw_parents(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      relation TEXT NOT NULL DEFAULT 'guardian',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (parent_id, student_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_teacher_assignments (
      teacher_id TEXT NOT NULL REFERENCES hw_teachers(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES hw_subjects(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      academic_year_id TEXT REFERENCES hw_academic_years(id) ON DELETE SET NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (teacher_id, class_id, subject_id, academic_year_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES hw_sections(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE (student_id, academic_year_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      requester_id TEXT NOT NULL,
      requester_role TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      event_type TEXT NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      audience TEXT[] NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      storage_key TEXT,
      mime_type TEXT,
      size_bytes INTEGER DEFAULT 0,
      audience TEXT[] NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_id_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id) ON DELETE CASCADE,
      generated_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (student_id, academic_year_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_alumni (
      student_id TEXT PRIMARY KEY REFERENCES hw_students(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      graduation_year_id TEXT REFERENCES hw_academic_years(id) ON DELETE SET NULL,
      graduation_date DATE,
      destination TEXT,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

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
    CREATE TABLE IF NOT EXISTS hw_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES hw_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'critical')),
      source_entity TEXT,
      source_id TEXT,
      read_at TIMESTAMPTZ,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS hw_notifications_recipient_idx ON hw_notifications (school_id, recipient_id, created_at DESC)`;

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
