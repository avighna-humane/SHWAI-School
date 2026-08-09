-- Migration: Foundational Layer for SHWAI School Operating System
-- Date: 2025-08-09
-- Author: Jules

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Core Structures
CREATE TABLE IF NOT EXISTS schools (
  id VARCHAR PRIMARY KEY DEFAULT 'sch-' || uuid_generate_v4()::text,
  name VARCHAR NOT NULL,
  code VARCHAR UNIQUE NOT NULL,
  board VARCHAR NOT NULL, -- 'CBSE', 'ICSE', 'State Board'
  city VARCHAR NOT NULL,
  state VARCHAR NOT NULL,
  logo_initials VARCHAR NOT NULL,
  plan VARCHAR NOT NULL DEFAULT 'enterprise', -- 'starter', 'professional', 'enterprise'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_years (
  id VARCHAR PRIMARY KEY DEFAULT 'ay-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE,
  label VARCHAR NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active', -- 'active', 'closed', 'planned'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR PRIMARY KEY DEFAULT 'cls-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE,
  grade INT NOT NULL,
  section VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  class_teacher_id VARCHAR,
  strength INT DEFAULT 0,
  room VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR PRIMARY KEY DEFAULT 'sub-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  color_token VARCHAR DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create User & Profile Records
CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR PRIMARY KEY DEFAULT 'usr-' || uuid_generate_v4()::text,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  phone_number VARCHAR,
  role VARCHAR NOT NULL, -- 'principal', 'teacher', 'student', 'parent', 'staff'
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  photo_hue INT DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id VARCHAR PRIMARY KEY DEFAULT 'std-' || uuid_generate_v4()::text,
  user_id VARCHAR REFERENCES user_profiles(id) ON DELETE CASCADE,
  admission_no VARCHAR UNIQUE NOT NULL,
  grade INT NOT NULL,
  section VARCHAR NOT NULL,
  class_id VARCHAR REFERENCES classes(id),
  dob DATE,
  guardian_name VARCHAR,
  guardian_phone VARCHAR,
  parent_id VARCHAR,
  attendance_pct DECIMAL DEFAULT 100.00,
  avg_score DECIMAL DEFAULT 0.00,
  homework_completion DECIMAL DEFAULT 0.00,
  house VARCHAR, -- 'Aravalli', 'Nilgiri', 'Shivalik', 'Vindhya'
  status VARCHAR NOT NULL DEFAULT 'active',
  photo_hue INT DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_profiles (
  id VARCHAR PRIMARY KEY DEFAULT 'par-' || uuid_generate_v4()::text,
  user_id VARCHAR REFERENCES user_profiles(id) ON DELETE CASCADE,
  relation VARCHAR NOT NULL, -- 'Father', 'Mother', 'Guardian'
  occupation VARCHAR,
  preferred_language VARCHAR DEFAULT 'en',
  engagement_score INT DEFAULT 50,
  photo_hue INT DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_student_relations (
  parent_id VARCHAR REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id VARCHAR REFERENCES student_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id VARCHAR PRIMARY KEY DEFAULT 'tch-' || uuid_generate_v4()::text,
  user_id VARCHAR REFERENCES user_profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR UNIQUE NOT NULL,
  subjects TEXT[], -- Array of subject names or codes
  classes TEXT[], -- Array of class labels
  experience_years INT,
  weekly_periods INT DEFAULT 0,
  attendance_pct DECIMAL DEFAULT 100.00,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  photo_hue INT DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Core Products tables (Calendar, Documents, Attendance, Notices)

CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR PRIMARY KEY DEFAULT 'evt-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  type VARCHAR NOT NULL, -- 'holiday', 'exam', 'ptm', 'event', 'sports', 'function', 'assignment-due'
  target_audience TEXT[], -- ['student', 'teacher', 'parent', 'staff']
  class_id VARCHAR REFERENCES classes(id),
  created_by VARCHAR REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR PRIMARY KEY DEFAULT 'doc-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR REFERENCES user_profiles(id) NOT NULL,
  name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL, -- Secure path inside storage bucket
  file_size_kb DECIMAL NOT NULL,
  file_type VARCHAR NOT NULL, -- 'PDF', 'DOCX', 'XLSX', 'images'
  visibility_audience TEXT[], -- ['student', 'teacher', 'parent', 'staff']
  class_id VARCHAR REFERENCES classes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR PRIMARY KEY DEFAULT 'att-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  student_id VARCHAR REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
  student_name VARCHAR NOT NULL,
  class_id VARCHAR REFERENCES classes(id) NOT NULL,
  status VARCHAR NOT NULL, -- 'present', 'absent', 'late', 'leave'
  marked_by VARCHAR NOT NULL, -- User profile ID who marked it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, student_id)
);

CREATE TABLE IF NOT EXISTS notices (
  id VARCHAR PRIMARY KEY DEFAULT 'not-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  author_id VARCHAR REFERENCES user_profiles(id) NOT NULL,
  author_name VARCHAR NOT NULL,
  author_role VARCHAR NOT NULL, -- 'teacher', 'principal'
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  audience_type VARCHAR NOT NULL, -- 'all_students', 'class', 'all_teachers', 'specific_teachers', 'specific_students', 'parents', 'school'
  audience_class_ids TEXT[] DEFAULT '{}',
  audience_teacher_ids TEXT[] DEFAULT '{}',
  audience_student_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notice_attachments (
  id VARCHAR PRIMARY KEY DEFAULT 'nat-' || uuid_generate_v4()::text,
  notice_id VARCHAR REFERENCES notices(id) ON DELETE CASCADE NOT NULL,
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notice_views (
  id VARCHAR PRIMARY KEY DEFAULT 'nvw-' || uuid_generate_v4()::text,
  notice_id VARCHAR REFERENCES notices(id) ON DELETE CASCADE NOT NULL,
  viewer_type VARCHAR NOT NULL, -- 'student', 'teacher'
  viewer_id VARCHAR NOT NULL, -- User/student/teacher profile ID
  first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework (
  id VARCHAR PRIMARY KEY DEFAULT 'hw-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id VARCHAR REFERENCES user_profiles(id) NOT NULL,
  teacher_name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  class_id VARCHAR REFERENCES classes(id) NOT NULL,
  class_label VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  total_marks INT,
  allow_resubmission BOOLEAN DEFAULT TRUE,
  status VARCHAR NOT NULL DEFAULT 'published', -- 'draft', 'published', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS homework_attachments (
  id VARCHAR PRIMARY KEY DEFAULT 'hwa-' || uuid_generate_v4()::text,
  homework_id VARCHAR REFERENCES homework(id) ON DELETE CASCADE NOT NULL,
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_views (
  id VARCHAR PRIMARY KEY DEFAULT 'hwv-' || uuid_generate_v4()::text,
  homework_id VARCHAR REFERENCES homework(id) ON DELETE CASCADE NOT NULL,
  student_id VARCHAR REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
  first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR PRIMARY KEY DEFAULT 'subm-' || uuid_generate_v4()::text,
  homework_id VARCHAR REFERENCES homework(id) ON DELETE CASCADE NOT NULL,
  student_id VARCHAR REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
  student_name VARCHAR NOT NULL,
  comment TEXT,
  status VARCHAR NOT NULL DEFAULT 'submitted', -- 'submitted', 'late', 'graded'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  marks INT,
  feedback TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_files (
  id VARCHAR PRIMARY KEY DEFAULT 'sfi-' || uuid_generate_v4()::text,
  submission_id VARCHAR REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY DEFAULT 'con-' || uuid_generate_v4()::text,
  school_id VARCHAR REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id VARCHAR NOT NULL,
  student_id VARCHAR NOT NULL,
  other_id VARCHAR NOT NULL,
  other_name VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT 'msg-' || uuid_generate_v4()::text,
  conversation_id VARCHAR REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type VARCHAR NOT NULL, -- 'teacher', 'student'
  sender_id VARCHAR NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_by_teacher_at TIMESTAMP WITH TIME ZONE,
  read_by_student_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id VARCHAR PRIMARY KEY DEFAULT 'mat-' || uuid_generate_v4()::text,
  message_id VARCHAR REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Row Level Security Policies (Strict Tenant & Multi-Tenant Isolation)
-- Enable Row Level Security (RLS) on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Note: Since the interim-auth model utilizes service-role operations via server functions,
-- real RLS policies below enforce tenant checking for both service-role/admin clients and prospective real users.
-- We ensure `school_id` matches the caller's school context.

-- A user profile policy to isolate user reads per school
CREATE POLICY user_profile_tenant_isolation ON user_profiles
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY school_tenant_isolation ON schools
  FOR ALL USING (id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY class_tenant_isolation ON classes
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY calendar_event_tenant_isolation ON calendar_events
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY document_tenant_isolation ON documents
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY attendance_record_tenant_isolation ON attendance_records
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY notice_tenant_isolation ON notices
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY homework_tenant_isolation ON homework
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

-- Indirect/Child Table Tenant Isolation Policies
CREATE POLICY student_profile_tenant_isolation ON student_profiles
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY parent_profile_tenant_isolation ON parent_profiles
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY teacher_profile_tenant_isolation ON teacher_profiles
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY parent_student_relation_tenant_isolation ON parent_student_relations
  FOR ALL USING (parent_id IN (SELECT id FROM parent_profiles WHERE user_id IN (SELECT id FROM user_profiles WHERE school_id = current_setting('request.jwt.claim.school_id', true))));

CREATE POLICY submission_tenant_isolation ON submissions
  FOR ALL USING (homework_id IN (SELECT id FROM homework WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY conversation_tenant_isolation ON conversations
  FOR ALL USING (school_id = current_setting('request.jwt.claim.school_id', true));

CREATE POLICY message_tenant_isolation ON messages
  FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY message_attachment_tenant_isolation ON message_attachments
  FOR ALL USING (message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE school_id = current_setting('request.jwt.claim.school_id', true))));

CREATE POLICY notice_attachment_tenant_isolation ON notice_attachments
  FOR ALL USING (notice_id IN (SELECT id FROM notices WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY notice_view_tenant_isolation ON notice_views
  FOR ALL USING (notice_id IN (SELECT id FROM notices WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY homework_attachment_tenant_isolation ON homework_attachments
  FOR ALL USING (homework_id IN (SELECT id FROM homework WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY homework_view_tenant_isolation ON homework_views
  FOR ALL USING (homework_id IN (SELECT id FROM homework WHERE school_id = current_setting('request.jwt.claim.school_id', true)));

CREATE POLICY submission_file_tenant_isolation ON submission_files
  FOR ALL USING (submission_id IN (SELECT id FROM submissions WHERE homework_id IN (SELECT id FROM homework WHERE school_id = current_setting('request.jwt.claim.school_id', true))));

-- 6. Add Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_school ON calendar_events(school_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_school ON documents(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_notices_school ON notices(school_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_homework_school_class ON homework(school_id, class_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_homework ON submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(school_id, teacher_id, student_id);
