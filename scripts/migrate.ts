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

  await sql`ALTER TABLE hw_calendar_events ADD COLUMN IF NOT EXISTS source_entity TEXT`;
  await sql`ALTER TABLE hw_calendar_events ADD COLUMN IF NOT EXISTS source_id TEXT`;
  await sql`ALTER TABLE hw_homework ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'standard'`;
  await sql`ALTER TABLE hw_homework ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published'`;
  await sql`ALTER TABLE hw_homework ADD COLUMN IF NOT EXISTS section_id TEXT`;
  await sql`ALTER TABLE hw_homework ADD COLUMN IF NOT EXISTS assigned_student_id TEXT`;
  await sql`ALTER TABLE hw_homework ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE hw_submissions ADD COLUMN IF NOT EXISTS attempt_no INTEGER NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE hw_submissions ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE hw_submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE hw_submissions ADD COLUMN IF NOT EXISTS grading_status TEXT NOT NULL DEFAULT 'pending'`;
  await sql`ALTER TABLE hw_submissions ADD COLUMN IF NOT EXISTS grade_published BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE hw_submissions DROP CONSTRAINT IF EXISTS hw_submissions_homework_id_student_id_key`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS hw_submissions_attempt_key ON hw_submissions (homework_id, student_id, attempt_no)`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id),
      title TEXT NOT NULL,
      subject_id TEXT,
      subject TEXT NOT NULL,
      class_id TEXT NOT NULL,
      section_id TEXT,
      teacher_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL CHECK (assessment_type IN ('quiz', 'test', 'examination', 'assignment')),
      maximum_marks NUMERIC(8,2) NOT NULL CHECK (maximum_marks > 0),
      assessment_date DATE NOT NULL,
      duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
      instructions TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_assessment_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID NOT NULL REFERENCES hw_assessments(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'subjective')),
      prompt TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]'::JSONB,
      correct_answer TEXT,
      marks NUMERIC(8,2) NOT NULL CHECK (marks > 0),
      answer_key TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_assessment_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID NOT NULL REFERENCES hw_assessments(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
      score NUMERIC(8,2),
      feedback TEXT NOT NULL DEFAULT '',
      UNIQUE (assessment_id, student_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_assessment_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id UUID NOT NULL REFERENCES hw_assessment_attempts(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES hw_assessment_questions(id) ON DELETE CASCADE,
      response TEXT NOT NULL DEFAULT '',
      marks_awarded NUMERIC(8,2),
      feedback TEXT NOT NULL DEFAULT '',
      UNIQUE (attempt_id, question_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_grades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id),
      subject_id TEXT,
      subject TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      assessment_id UUID REFERENCES hw_assessments(id) ON DELETE SET NULL,
      homework_id UUID REFERENCES hw_homework(id) ON DELETE SET NULL,
      maximum_marks NUMERIC(8,2) NOT NULL CHECK (maximum_marks > 0),
      obtained_marks NUMERIC(8,2) NOT NULL CHECK (obtained_marks >= 0),
      percentage NUMERIC(6,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
      grade TEXT,
      feedback TEXT NOT NULL DEFAULT '',
      publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      CHECK (obtained_marks <= maximum_marks),
      CHECK (assessment_id IS NOT NULL OR homework_id IS NOT NULL)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_report_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id),
      class_id TEXT,
      section_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
      overall_percentage NUMERIC(6,2),
      overall_grade TEXT,
      attendance_percentage NUMERIC(6,2),
      teacher_feedback TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      UNIQUE (student_id, academic_year_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_report_card_subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_card_id UUID NOT NULL REFERENCES hw_report_cards(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      subject_id TEXT,
      subject TEXT NOT NULL,
      maximum_marks NUMERIC(8,2) NOT NULL,
      obtained_marks NUMERIC(8,2) NOT NULL,
      percentage NUMERIC(6,2) NOT NULL,
      grade TEXT,
      teacher_feedback TEXT NOT NULL DEFAULT '',
      UNIQUE (report_card_id, subject)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_timetable_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES hw_academic_years(id),
      class_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      subject_id TEXT,
      subject TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      room TEXT NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (end_time > start_time)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_substitute_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      absent_teacher_id TEXT NOT NULL,
      substitute_teacher_id TEXT NOT NULL,
      date DATE NOT NULL,
      class_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      subject_id TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'cancelled')),
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (school_id, date, class_id, section_id, subject)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_engagement_awards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      activity_key TEXT NOT NULL,
      source_entity TEXT NOT NULL,
      source_id TEXT NOT NULL,
      xp INTEGER NOT NULL CHECK (xp > 0),
      badge TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      awarded_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (school_id, student_id, activity_key, source_entity, source_id)
    )`;

  await sql`CREATE INDEX IF NOT EXISTS hw_assessments_school_date_idx ON hw_assessments (school_id, assessment_date)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_grades_student_publication_idx ON hw_grades (school_id, student_id, publication_status)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_timetable_school_day_idx ON hw_timetable_entries (school_id, academic_year_id, weekday)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_report_cards_student_year_idx ON hw_report_cards (school_id, student_id, academic_year_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_ai_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      feature TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_id TEXT NOT NULL,
      input_chars INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER,
      status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked', 'configuration_required')),
      error_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_ai_content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL,
      content_type TEXT NOT NULL,
      subject TEXT,
      class_id TEXT,
      topic TEXT,
      title TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_ai_tutor_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      topic TEXT,
      subject TEXT,
      class_label TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_ai_tutor_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES hw_ai_tutor_sessions(id) ON DELETE CASCADE,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'system')),
      content TEXT NOT NULL,
      hint_level INTEGER CHECK (hint_level IS NULL OR hint_level BETWEEN 0 AND 5),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_ai_learning_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      topic TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      source_id TEXT,
      hints_requested INTEGER NOT NULL DEFAULT 0,
      successful BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS hw_ai_usage_school_created_idx ON hw_ai_usage (school_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_ai_content_school_creator_idx ON hw_ai_content (school_id, created_by, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_ai_tutor_student_idx ON hw_ai_tutor_sessions (school_id, student_id, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_ai_learning_student_topic_idx ON hw_ai_learning_events (school_id, student_id, topic, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      window_days INTEGER NOT NULL CHECK (window_days IN (7, 14, 30, 90)),
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
      triggered_by TEXT NOT NULL,
      records_examined INTEGER NOT NULL DEFAULT 0,
      signals_created INTEGER NOT NULL DEFAULT 0,
      alerts_created INTEGER NOT NULL DEFAULT 0,
      data_quality JSONB NOT NULL DEFAULT '{}'::JSONB,
      error_message TEXT NOT NULL DEFAULT '',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_signals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id UUID REFERENCES hw_intelligence_runs(id) ON DELETE SET NULL,
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('attendance', 'academic', 'homework', 'engagement', 'concept')),
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      observed_value NUMERIC(10,2),
      baseline_value NUMERIC(10,2),
      delta_value NUMERIC(10,2),
      direction TEXT NOT NULL CHECK (direction IN ('up', 'down', 'flat', 'insufficient_data')),
      observation_start DATE NOT NULL,
      observation_end DATE NOT NULL,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      data_quality TEXT NOT NULL CHECK (data_quality IN ('good', 'limited', 'insufficient')),
      explanation TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      run_id UUID REFERENCES hw_intelligence_runs(id) ON DELETE SET NULL,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'attention', 'urgent')),
      confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'insufficient_data')),
      confidence_reason TEXT NOT NULL,
      observation_start DATE NOT NULL,
      observation_end DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'assigned', 'in_progress', 'follow_up', 'resolved', 'dismissed')),
      owner_id TEXT,
      acknowledged_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      alert_id UUID NOT NULL REFERENCES hw_intelligence_alerts(id) ON DELETE CASCADE,
      signal_id UUID REFERENCES hw_intelligence_signals(id) ON DELETE SET NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      detail TEXT NOT NULL,
      source_entity TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_recommendations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      alert_id UUID NOT NULL REFERENCES hw_intelligence_alerts(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      rationale TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected', 'converted')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_interventions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      alert_id UUID REFERENCES hw_intelligence_alerts(id) ON DELETE SET NULL,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      issue TEXT NOT NULL,
      evidence TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      owner_id TEXT,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'assigned', 'in_progress', 'follow_up', 'completed', 'outcome_measured', 'cancelled')),
      notes TEXT NOT NULL DEFAULT '',
      target_date DATE,
      follow_up_date DATE,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intervention_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      intervention_id UUID NOT NULL REFERENCES hw_interventions(id) ON DELETE CASCADE,
      scheduled_for DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'overdue', 'completed', 'cancelled')),
      notes TEXT NOT NULL DEFAULT '',
      completed_by TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intervention_outcomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      intervention_id UUID NOT NULL REFERENCES hw_interventions(id) ON DELETE CASCADE,
      measured_at DATE NOT NULL,
      metric_name TEXT NOT NULL,
      before_value NUMERIC(10,2),
      after_value NUMERIC(10,2),
      outcome TEXT NOT NULL CHECK (outcome IN ('improved', 'unchanged', 'declined', 'insufficient_data')),
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      observation_start DATE NOT NULL,
      observation_end DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      content JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_signals_student_idx ON hw_intelligence_signals (school_id, student_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_signals_category_idx ON hw_intelligence_signals (school_id, category, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_alerts_status_idx ON hw_intelligence_alerts (school_id, status, severity, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_alerts_student_idx ON hw_intelligence_alerts (school_id, student_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_evidence_alert_idx ON hw_intelligence_evidence (school_id, alert_id)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_recommendations_alert_idx ON hw_intelligence_recommendations (school_id, alert_id)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_interventions_status_idx ON hw_interventions (school_id, status, priority, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intervention_followups_date_idx ON hw_intervention_followups (school_id, status, scheduled_for)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intervention_outcomes_idx ON hw_intervention_outcomes (school_id, intervention_id, measured_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_reports_idx ON hw_intelligence_reports (school_id, report_type, created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_concepts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      concept_key TEXT NOT NULL,
      label TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL CHECK (source_type IN ('curriculum_admin', 'ai_content_metadata', 'teacher_defined')),
      source_id TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, concept_key)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_prerequisites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      prerequisite_concept_id UUID NOT NULL REFERENCES hw_intelligence_concepts(id) ON DELETE CASCADE,
      dependent_concept_id UUID NOT NULL REFERENCES hw_intelligence_concepts(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, prerequisite_concept_id, dependent_concept_id),
      CHECK (prerequisite_concept_id <> dependent_concept_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_parent_intelligence_acknowledgements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      alert_id UUID REFERENCES hw_intelligence_alerts(id) ON DELETE SET NULL,
      viewed_at TIMESTAMPTZ,
      acknowledged_at TIMESTAMPTZ,
      response TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, parent_id, student_id, alert_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_parent_meeting_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      requested_start TIMESTAMPTZ NOT NULL,
      requested_end TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'alternative_proposed', 'declined', 'completed', 'cancelled')),
      participants TEXT[] NOT NULL DEFAULT '{}',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_automation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      rule_key TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('daily_attendance', 'weekly_academic', 'weekly_homework', 'monthly_report')),
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      recipient_role TEXT NOT NULL CHECK (recipient_role IN ('teacher', 'staff', 'principal', 'admin', 'parent')),
      action_type TEXT NOT NULL CHECK (action_type IN ('scan', 'notification', 'report_summary', 'revision_recommendation')),
      configuration JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, rule_key)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intelligence_automation_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      rule_id UUID REFERENCES hw_intelligence_automation_rules(id) ON DELETE SET NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
      idempotency_key TEXT NOT NULL,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      detail TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, idempotency_key)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_concepts_subject_idx ON hw_intelligence_concepts (school_id, subject, label)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_prerequisites_dependent_idx ON hw_intelligence_prerequisites (school_id, dependent_concept_id)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_parent_intelligence_ack_idx ON hw_parent_intelligence_acknowledgements (school_id, parent_id, student_id)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_parent_meeting_requests_idx ON hw_parent_meeting_requests (school_id, status, requested_start)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_intelligence_automation_runs_idx ON hw_intelligence_automation_runs (school_id, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS hw_campuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, code TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, code)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_admission_enquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, applicant_name TEXT NOT NULL, guardian_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', grade_requested INTEGER, source TEXT NOT NULL DEFAULT 'direct',
      status TEXT NOT NULL DEFAULT 'ENQUIRY' CHECK (status IN ('ENQUIRY','APPLICATION_STARTED','APPLICATION_SUBMITTED','DOCUMENT_REVIEW','ENTRANCE_TEST','DECISION','ACCEPTED','REJECTED','WAITLISTED','ENROLLED')),
      notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_admission_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      enquiry_id UUID REFERENCES hw_admission_enquiries(id) ON DELETE SET NULL, applicant_name TEXT NOT NULL, guardian_name TEXT NOT NULL DEFAULT '',
      campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, grade_requested INTEGER, academic_year_id TEXT REFERENCES hw_academic_years(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'APPLICATION_STARTED' CHECK (status IN ('APPLICATION_STARTED','APPLICATION_SUBMITTED','DOCUMENT_REVIEW','ENTRANCE_TEST','DECISION','ACCEPTED','REJECTED','WAITLISTED','ENROLLED')),
      decision_reason TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_admission_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      application_id UUID NOT NULL REFERENCES hw_admission_applications(id) ON DELETE CASCADE, document_type TEXT NOT NULL, file_reference TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('requested','received','reviewed','rejected')), review_notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_admission_tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      application_id UUID NOT NULL REFERENCES hw_admission_applications(id) ON DELETE CASCADE, subject TEXT NOT NULL, scheduled_at TIMESTAMPTZ,
      score NUMERIC(7,2), result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','pass','fail','absent')), notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_admission_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE,
      enquiry_id UUID REFERENCES hw_admission_enquiries(id) ON DELETE CASCADE, application_id UUID REFERENCES hw_admission_applications(id) ON DELETE CASCADE,
      due_at TIMESTAMPTZ NOT NULL, owner_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')), notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL,
      academic_year_id TEXT REFERENCES hw_academic_years(id) ON DELETE SET NULL, name TEXT NOT NULL, grade INTEGER, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), currency TEXT NOT NULL DEFAULT 'INR', active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
      fee_structure_id UUID NOT NULL REFERENCES hw_fee_structures(id) ON DELETE CASCADE, scholarship_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (scholarship_amount >= 0), concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED')),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by TEXT NOT NULL, UNIQUE (school_id, student_id, fee_structure_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_installments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, assignment_id UUID NOT NULL REFERENCES hw_fee_assignments(id) ON DELETE CASCADE,
      label TEXT NOT NULL, due_date DATE NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, installment_id UUID NOT NULL REFERENCES hw_fee_installments(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), payment_reference TEXT NOT NULL, payment_method TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed','pending_provider')), paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), receipt_number TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, installment_id UUID NOT NULL REFERENCES hw_fee_installments(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'in_app', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','blocked','failed')), provider_reference TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_fee_reconciliations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, period_label TEXT NOT NULL, expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0, recorded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','variance_review')), notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_staff_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, staff_id TEXT NOT NULL,
      assignment_type TEXT NOT NULL, title TEXT NOT NULL, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, estimated_minutes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','completed','cancelled')), created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_workload_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, teacher_id TEXT NOT NULL, task_type TEXT NOT NULL, title TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL DEFAULT 0, actual_minutes INTEGER, frequency TEXT NOT NULL DEFAULT 'once', due_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')), created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_transport_routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, name TEXT NOT NULL, code TEXT NOT NULL, provider_key TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, code)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_transport_stops (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, route_id UUID NOT NULL REFERENCES hw_transport_routes(id) ON DELETE CASCADE, name TEXT NOT NULL, sequence_no INTEGER NOT NULL, latitude NUMERIC(10,7), longitude NUMERIC(10,7), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (route_id, sequence_no)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_transport_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE, route_id UUID NOT NULL REFERENCES hw_transport_routes(id) ON DELETE CASCADE, stop_id UUID REFERENCES hw_transport_stops(id) ON DELETE SET NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, student_id, route_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_transport_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, route_id UUID REFERENCES hw_transport_routes(id) ON DELETE SET NULL, student_id TEXT REFERENCES hw_students(id) ON DELETE SET NULL, event_type TEXT NOT NULL CHECK (event_type IN ('pickup','drop','incident','emergency')), event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), details TEXT NOT NULL DEFAULT '', provider_reference TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_library_books (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, isbn TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, author TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_library_copies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, book_id UUID NOT NULL REFERENCES hw_library_books(id) ON DELETE CASCADE, barcode TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','loaned','lost','maintenance')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, barcode)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_library_loans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, copy_id UUID NOT NULL REFERENCES hw_library_copies(id) ON DELETE CASCADE, borrower_id TEXT NOT NULL, borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), due_at DATE NOT NULL, returned_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned','overdue','lost')), created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, sku TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0), reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0), location TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, sku)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_inventory_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, item_id UUID NOT NULL REFERENCES hw_inventory_items(id) ON DELETE CASCADE, movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase','issue','return','adjustment')), quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0), reference TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_facilities_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, campus_id UUID REFERENCES hw_campuses(id) ON DELETE SET NULL, name TEXT NOT NULL, room_type TEXT NOT NULL DEFAULT 'classroom', capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0), active BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_facilities_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, room_id UUID REFERENCES hw_facilities_rooms(id) ON DELETE SET NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED')), assigned_to TEXT, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_certificates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE, certificate_type TEXT NOT NULL, issue_date DATE NOT NULL, issuer_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','revoked')), verification_identifier TEXT NOT NULL DEFAULT '', artifact_reference TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_v5_scenarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', baseline JSONB NOT NULL DEFAULT '{}'::JSONB, changed_variables JSONB NOT NULL DEFAULT '{}'::JSONB, assumptions JSONB NOT NULL DEFAULT '{}'::JSONB, constraints JSONB NOT NULL DEFAULT '{}'::JSONB, outputs JSONB NOT NULL DEFAULT '{}'::JSONB, warnings JSONB NOT NULL DEFAULT '[]'::JSONB, tradeoffs JSONB NOT NULL DEFAULT '[]'::JSONB, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','calculated','selected','archived')), created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_v5_decision_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, scenario_id UUID NOT NULL REFERENCES hw_v5_scenarios(id) ON DELETE CASCADE, selected_option TEXT NOT NULL, decision_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_curriculum_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, subject_id TEXT REFERENCES hw_subjects(id) ON DELETE SET NULL, class_id TEXT REFERENCES hw_classes(id) ON DELETE SET NULL, title TEXT NOT NULL, expected_start DATE, expected_completion DATE, priority TEXT NOT NULL DEFAULT 'normal', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_curriculum_coverage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, unit_id UUID NOT NULL REFERENCES hw_curriculum_units(id) ON DELETE CASCADE, actual_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (actual_status IN ('NOT_STARTED','IN_PROGRESS','COVERED','PARTIALLY_COVERED','REQUIRES_REVIEW')), actual_completion DATE, assessments_completed INTEGER NOT NULL DEFAULT 0, concept_mastery JSONB NOT NULL DEFAULT '{}'::JSONB, evidence TEXT NOT NULL DEFAULT '', recorded_by TEXT NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, unit_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_learning_debt_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, unit_id UUID REFERENCES hw_curriculum_units(id) ON DELETE SET NULL, category TEXT NOT NULL CHECK (category IN ('not_taught','poorly_understood','prerequisite_gap','misconception','memorization_without_mastery','over_covered','under_covered')), evidence JSONB NOT NULL DEFAULT '{}'::JSONB, affected_group TEXT NOT NULL DEFAULT '', severity TEXT NOT NULL DEFAULT 'attention' CHECK (severity IN ('info','attention','urgent')), recommended_action TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved','dismissed')), created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_intervention_experiments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, problem TEXT NOT NULL, hypothesis TEXT NOT NULL, intervention TEXT NOT NULL, target_group TEXT NOT NULL, baseline_metric TEXT NOT NULL, baseline_value NUMERIC(12,2), target_value NUMERIC(12,2), owner_id TEXT NOT NULL, start_date DATE NOT NULL, review_date DATE NOT NULL, comparison_method TEXT NOT NULL DEFAULT 'previous_period', status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','review','completed','cancelled')), outcome TEXT NOT NULL DEFAULT '', evidence JSONB NOT NULL DEFAULT '{}'::JSONB, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_experiment_measurements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, experiment_id UUID NOT NULL REFERENCES hw_intervention_experiments(id) ON DELETE CASCADE, measured_at DATE NOT NULL, phase TEXT NOT NULL CHECK (phase IN ('baseline','implementation','follow_up','outcome')), metric_value NUMERIC(12,2), sample_size INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_student_context_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE, category TEXT NOT NULL, value TEXT NOT NULL, source TEXT NOT NULL, consent_status TEXT NOT NULL DEFAULT 'required' CHECK (consent_status IN ('not_required','pending','granted','revoked')), visibility TEXT NOT NULL DEFAULT 'need_to_know' CHECK (visibility IN ('need_to_know','student_support','leadership_only')), expires_at DATE, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','correction_requested')), created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_context_corrections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, context_id UUID NOT NULL REFERENCES hw_student_context_records(id) ON DELETE CASCADE, requested_by TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','reviewed','accepted','rejected')), reviewed_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_help_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, provider_type TEXT NOT NULL CHECK (provider_type IN ('teacher_office_hours','peer_tutor','remedial_group','library_resource','verified_external','pastoral_support')), name TEXT NOT NULL, subjects TEXT[] NOT NULL DEFAULT '{}', languages TEXT[] NOT NULL DEFAULT '{}', approved BOOLEAN NOT NULL DEFAULT FALSE, age_min INTEGER, age_max INTEGER, availability JSONB NOT NULL DEFAULT '{}'::JSONB, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_help_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE, subject TEXT NOT NULL, topic TEXT NOT NULL, language TEXT NOT NULL DEFAULT '', requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','completed','cancelled')), created_by TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_help_matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, request_id UUID NOT NULL REFERENCES hw_help_requests(id) ON DELETE CASCADE, provider_id UUID NOT NULL REFERENCES hw_help_providers(id) ON DELETE CASCADE, safety_notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','active','completed','declined')), approved_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_offline_operations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, operation_id TEXT NOT NULL, actor_id TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::JSONB, local_version TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SYNCING','SYNCED','FAILED','CONFLICT')), error_message TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, operation_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_v5_provider_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, provider_type TEXT NOT NULL CHECK (provider_type IN ('payment','gps','sms','whatsapp','payroll','storage','translation')), enabled BOOLEAN NOT NULL DEFAULT FALSE, configuration_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (configuration_status IN ('not_configured','configured','verified','failed')), public_label TEXT NOT NULL DEFAULT '', secret_reference TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, provider_type)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_data_access_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL DEFAULT '', fields TEXT[] NOT NULL DEFAULT '{}', reason TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_data_retention_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, entity TEXT NOT NULL, retention_days INTEGER NOT NULL CHECK (retention_days > 0), legal_hold BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE, updated_by TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (school_id, entity)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS hw_data_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id TEXT NOT NULL REFERENCES hw_schools(id) ON DELETE CASCADE, requester_id TEXT NOT NULL, request_type TEXT NOT NULL CHECK (request_type IN ('export','deletion')), scope JSONB NOT NULL DEFAULT '{}'::JSONB, status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','completed','rejected','blocked_legal_hold')), reviewed_by TEXT, reason TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS hw_v5_campuses_school_idx ON hw_campuses (school_id, active)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_admission_pipeline_idx ON hw_admission_applications (school_id, status, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_fee_assignments_student_idx ON hw_fee_assignments (school_id, student_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_fee_installments_due_idx ON hw_fee_installments (school_id, status, due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_staff_assignments_staff_idx ON hw_staff_assignments (school_id, staff_id, starts_at)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_workload_tasks_teacher_idx ON hw_workload_tasks (school_id, teacher_id, due_at, status)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_transport_assignments_student_idx ON hw_transport_assignments (school_id, student_id, active)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_transport_events_route_idx ON hw_transport_events (school_id, route_id, event_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_library_loans_borrower_idx ON hw_library_loans (school_id, borrower_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_inventory_movements_item_idx ON hw_inventory_movements (school_id, item_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_facilities_requests_status_idx ON hw_facilities_requests (school_id, status, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_v5_scenarios_school_idx ON hw_v5_scenarios (school_id, status, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_curriculum_debt_school_idx ON hw_learning_debt_records (school_id, status, severity, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_experiments_school_idx ON hw_intervention_experiments (school_id, status, review_date)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_context_records_student_idx ON hw_student_context_records (school_id, student_id, status, expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_help_requests_student_idx ON hw_help_requests (school_id, student_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_offline_operations_sync_idx ON hw_offline_operations (school_id, status, updated_at)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_v5_access_logs_idx ON hw_data_access_logs (school_id, entity, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS hw_v5_data_requests_idx ON hw_data_requests (school_id, request_type, status, created_at DESC)`;

  console.log("Migration complete!");
  await sql.end();
}

migrate().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exitCode = 1;
});
