import postgres from "postgres";
import { webcrypto } from "node:crypto";

const crypto = webcrypto;
const DB_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";
const DEMO_PASSWORD = "DemoOnly!2026";
const SCHOOL_ID = "demo-school-shwai";
const YEAR_ID = "demo-year-2026";
const CLASS_ID = "cls-9A";
const SECTION_ID = "sec-9A";
const SUBJECT_MATH = "demo-subject-math";
const SUBJECT_SCIENCE = "demo-subject-science";
const USER_OWNER = "demo-user-owner";
const USER_PRINCIPAL = "demo-user-principal";
const USER_ADMIN = "demo-user-admin";
const USER_TEACHER = "demo-user-teacher";
const USER_STUDENT = "demo-user-student";
const USER_PARENT = "demo-user-parent";
const USER_STAFF = "demo-user-staff";
const STUDENT_ID = USER_STUDENT;
const STUDENT_TWO_ID = "demo-student-2";
const TEACHER_ID = USER_TEACHER;
const PARENT_ID = USER_PARENT;
const STAFF_ID = USER_STAFF;
const HOMEWORK_ID = "00000000-0000-0000-0000-000000000101";
const ASSESSMENT_ID = "00000000-0000-0000-0000-000000000102";
const TUTOR_SESSION_ID = "00000000-0000-0000-0000-000000000103";
const INTELLIGENCE_RUN_ID = "00000000-0000-0000-0000-000000000104";
const SIGNAL_ID = "00000000-0000-0000-0000-000000000105";
const ALERT_ID = "00000000-0000-0000-0000-000000000106";
const INTERVENTION_ID = "00000000-0000-0000-0000-000000000107";
const CONCEPT_ID = "00000000-0000-0000-0000-000000000108";
const DEPENDENT_CONCEPT_ID = "00000000-0000-0000-0000-000000000109";
const PROVENANCE_ID = "00000000-0000-0000-0000-000000000110";
const OUTPUT_VERSION_ID = "00000000-0000-0000-0000-000000000111";
const KNOWLEDGE_SOURCE_ID = "00000000-0000-0000-0000-000000000112";
const KNOWLEDGE_CHUNK_ID = "00000000-0000-0000-0000-000000000113";
const PREDICTION_ID = "00000000-0000-0000-0000-000000000114";
const JOURNEY_ID = "00000000-0000-0000-0000-000000000115";

if (process.env.NODE_ENV !== "development") {
  console.error(
    "Refusing to seed outside NODE_ENV=development. This command only creates fictional local data.",
  );
  process.exit(1);
}
if (!DB_URL) {
  console.error(
    "DATABASE_URL or SUPABASE_DATABASE_URL is required. Run npm run db:migrate first with a local PostgreSQL URL.",
  );
  process.exit(1);
}

const sql = postgres(DB_URL, {
  ssl: process.env.NODE_ENV === "production" || DB_URL.includes("supabase") ? "require" : undefined,
});

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, "binary").toString("base64url");
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2-sha256$210000$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function seed() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  console.log("Seeding fictional SHWAI Demo Academy records...");
  await sql.begin(async (tx) => {
    await tx`INSERT INTO hw_schools (id, name, slug, timezone, country, currency, grading_system, curriculum, language, onboarding_status, onboarding_step, plan, subscription_status) VALUES (${SCHOOL_ID}, 'SHWAI Demo Academy', 'shwai-demo-academy', 'Asia/Kolkata', 'IN', 'INR', 'percentage', 'CBSE', 'en', 'complete', 'operational_ready', 'enterprise', 'demo') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = TRUE, onboarding_status = EXCLUDED.onboarding_status, onboarding_step = EXCLUDED.onboarding_step, plan = EXCLUDED.plan, subscription_status = EXCLUDED.subscription_status`;

    const users = [
      [USER_OWNER, "owner@demo.local", "Harish Demo", "owner"],
      [USER_PRINCIPAL, "principal@demo.local", "Priya Demo", "principal"],
      [USER_ADMIN, "admin@demo.local", "Aman Demo", "admin"],
      [USER_TEACHER, "teacher@demo.local", "Meera Demo", "teacher"],
      [USER_STUDENT, "student@demo.local", "Aarav Demo", "student"],
      [USER_PARENT, "parent@demo.local", "Rajesh Demo", "parent"],
      [USER_STAFF, "staff@demo.local", "Kavita Demo", "staff"],
    ] as const;
    for (const [id, email, name, role] of users) {
      await tx`INSERT INTO hw_users (id, email, name, password_hash, active, email_verified_at, password_changed_at) VALUES (${id}, ${email}, ${name}, ${passwordHash}, TRUE, NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, active = TRUE, email_verified_at = NOW(), password_changed_at = NOW(), updated_at = NOW()`;
      await tx`INSERT INTO hw_memberships (user_id, school_id, role, active) VALUES (${id}, ${SCHOOL_ID}, ${role}, TRUE) ON CONFLICT (user_id, school_id) DO UPDATE SET role = EXCLUDED.role, active = TRUE`;
      await tx`INSERT INTO hw_user_consents (user_id, school_id, consent_type, version, granted) SELECT ${id}, ${SCHOOL_ID}, 'terms_and_privacy', 'demo-v1', TRUE WHERE NOT EXISTS (SELECT 1 FROM hw_user_consents WHERE user_id = ${id} AND school_id = ${SCHOOL_ID} AND consent_type = 'terms_and_privacy')`;
    }
    await tx`INSERT INTO hw_identity_policies (school_id, require_email_verification, require_mfa_for_privileged, mfa_provider, updated_by) VALUES (${SCHOOL_ID}, TRUE, FALSE, 'configuration_required', ${USER_OWNER}) ON CONFLICT (school_id) DO UPDATE SET require_email_verification = TRUE, require_mfa_for_privileged = FALSE, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;

    await tx`INSERT INTO hw_academic_years (id, school_id, label, start_date, end_date, status) VALUES (${YEAR_ID}, ${SCHOOL_ID}, '2026–2027', '2026-04-01', '2027-03-31', 'active') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_classes (id, school_id, grade, label, active) VALUES (${CLASS_ID}, ${SCHOOL_ID}, 9, 'Grade 9', TRUE) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_sections (id, school_id, class_id, name, active) VALUES (${SECTION_ID}, ${SCHOOL_ID}, ${CLASS_ID}, 'A', TRUE) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_subjects (id, school_id, name, active) VALUES (${SUBJECT_MATH}, ${SCHOOL_ID}, 'Mathematics', TRUE), (${SUBJECT_SCIENCE}, ${SCHOOL_ID}, 'Science', TRUE) ON CONFLICT (id) DO NOTHING`;

    await tx`INSERT INTO hw_students (id, school_id, user_id, admission_no, name, dob, gender, guardian_name, guardian_phone, status) VALUES (${STUDENT_ID}, ${SCHOOL_ID}, ${USER_STUDENT}, 'SDA-0001', 'Aarav Demo', '2011-07-14', 'male', 'Rajesh Demo', '+91-9000000001', 'active'), (${STUDENT_TWO_ID}, ${SCHOOL_ID}, NULL, 'SDA-0002', 'Ananya Demo', '2011-11-02', 'female', 'Rajesh Demo', '+91-9000000001', 'active') ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, name = EXCLUDED.name, status = 'active'`;
    await tx`INSERT INTO hw_teachers (id, school_id, user_id, employee_id, name, email, phone, active) VALUES (${TEACHER_ID}, ${SCHOOL_ID}, ${USER_TEACHER}, 'T-0001', 'Meera Demo', 'teacher@demo.local', '+91-9000000002', TRUE) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, active = TRUE`;
    await tx`INSERT INTO hw_parents (id, school_id, user_id, name, email, phone, active) VALUES (${PARENT_ID}, ${SCHOOL_ID}, ${USER_PARENT}, 'Rajesh Demo', 'parent@demo.local', '+91-9000000001', TRUE) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, active = TRUE`;
    await tx`INSERT INTO hw_staff (id, school_id, user_id, name, designation, department, active) VALUES (${STAFF_ID}, ${SCHOOL_ID}, ${USER_STAFF}, 'Kavita Demo', 'Front Office Coordinator', 'Administration', TRUE) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, active = TRUE`;
    await tx`INSERT INTO hw_parent_students (parent_id, student_id, school_id, relation, active) VALUES (${PARENT_ID}, ${STUDENT_ID}, ${SCHOOL_ID}, 'guardian', TRUE), (${PARENT_ID}, ${STUDENT_TWO_ID}, ${SCHOOL_ID}, 'guardian', TRUE) ON CONFLICT (parent_id, student_id) DO UPDATE SET active = TRUE`;
    await tx`INSERT INTO hw_enrollments (school_id, student_id, academic_year_id, class_id, section_id, status) VALUES (${SCHOOL_ID}, ${STUDENT_ID}, ${YEAR_ID}, ${CLASS_ID}, ${SECTION_ID}, 'active'), (${SCHOOL_ID}, ${STUDENT_TWO_ID}, ${YEAR_ID}, ${CLASS_ID}, ${SECTION_ID}, 'active') ON CONFLICT (student_id, academic_year_id) DO NOTHING`;
    await tx`INSERT INTO hw_teacher_assignments (teacher_id, class_id, subject_id, school_id, academic_year_id, active) VALUES (${TEACHER_ID}, ${CLASS_ID}, ${SUBJECT_MATH}, ${SCHOOL_ID}, ${YEAR_ID}, TRUE), (${TEACHER_ID}, ${CLASS_ID}, ${SUBJECT_SCIENCE}, ${SCHOOL_ID}, ${YEAR_ID}, TRUE) ON CONFLICT (teacher_id, class_id, subject_id, academic_year_id) DO UPDATE SET active = TRUE`;

    await tx`INSERT INTO hw_attendance (school_id, student_id, student_name, class_id, date, status, marked_by, synced) VALUES (${SCHOOL_ID}, ${STUDENT_ID}, 'Aarav Demo', ${CLASS_ID}, '2026-08-17', 'present', ${USER_TEACHER}, TRUE), (${SCHOOL_ID}, ${STUDENT_ID}, 'Aarav Demo', ${CLASS_ID}, '2026-08-18', 'late', ${USER_TEACHER}, TRUE), (${SCHOOL_ID}, ${STUDENT_ID}, 'Aarav Demo', ${CLASS_ID}, '2026-08-19', 'present', ${USER_TEACHER}, TRUE), (${SCHOOL_ID}, ${STUDENT_TWO_ID}, 'Ananya Demo', ${CLASS_ID}, '2026-08-17', 'present', ${USER_TEACHER}, TRUE) ON CONFLICT (school_id, student_id, date) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`;
    await tx`INSERT INTO hw_homework (id, school_id, teacher_id, teacher_name, title, subject, class_id, class_label, section, description, due_date, total_marks, status) VALUES (${HOMEWORK_ID}, ${SCHOOL_ID}, ${TEACHER_ID}, 'Meera Demo', 'Linear equations practice', 'Mathematics', ${CLASS_ID}, 'Grade 9', 'A', 'Solve the five equations and show each step.', '2026-08-25', 20, 'published') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_submissions (homework_id, student_id, student_name, school_id, status, comment, file_name, file_size, file_type, submitted_at, grade, feedback) VALUES (${HOMEWORK_ID}, ${STUDENT_ID}, 'Aarav Demo', ${SCHOOL_ID}, 'graded', 'Completed with working.', 'linear-equations.txt', 1280, 'text/plain', NOW() - INTERVAL '1 day', 18, 'Good reasoning; check sign changes in question 4.') ON CONFLICT (homework_id, student_id) DO UPDATE SET status = EXCLUDED.status, grade = EXCLUDED.grade, feedback = EXCLUDED.feedback`;
    await tx`INSERT INTO hw_assessments (id, school_id, academic_year_id, title, subject_id, subject, class_id, section_id, teacher_id, assessment_type, maximum_marks, assessment_date, status) VALUES (${ASSESSMENT_ID}, ${SCHOOL_ID}, ${YEAR_ID}, 'Unit 1 Mathematics Check', ${SUBJECT_MATH}, 'Mathematics', ${CLASS_ID}, ${SECTION_ID}, ${TEACHER_ID}, 'test', 50, '2026-08-20', 'published') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_grades (school_id, student_id, academic_year_id, subject_id, subject, teacher_id, assessment_id, maximum_marks, obtained_marks, percentage, grade, feedback, publication_status, published_at) SELECT ${SCHOOL_ID}, ${STUDENT_ID}, ${YEAR_ID}, ${SUBJECT_MATH}, 'Mathematics', ${TEACHER_ID}, ${ASSESSMENT_ID}, 50, 42, 84, 'A', 'Strong understanding of linear equations.', 'published', NOW() WHERE NOT EXISTS (SELECT 1 FROM hw_grades WHERE school_id = ${SCHOOL_ID} AND student_id = ${STUDENT_ID} AND assessment_id = ${ASSESSMENT_ID})`;
    await tx`INSERT INTO hw_report_cards (school_id, student_id, academic_year_id, class_id, section_id, status, overall_percentage, overall_grade, attendance_percentage, teacher_feedback, created_by, published_at) VALUES (${SCHOOL_ID}, ${STUDENT_ID}, ${YEAR_ID}, ${CLASS_ID}, ${SECTION_ID}, 'published', 84, 'A', 96, 'A positive start to the academic year.', ${USER_TEACHER}, NOW()) ON CONFLICT (student_id, academic_year_id) DO UPDATE SET status = 'published', overall_percentage = EXCLUDED.overall_percentage`;
    await tx`INSERT INTO hw_timetable_entries (school_id, academic_year_id, class_id, section_id, subject_id, subject, teacher_id, room, weekday, start_time, end_time, status) SELECT ${SCHOOL_ID}, ${YEAR_ID}, ${CLASS_ID}, ${SECTION_ID}, ${SUBJECT_MATH}, 'Mathematics', ${TEACHER_ID}, 'Room 9A', 1, '09:00', '09:45', 'published' WHERE NOT EXISTS (SELECT 1 FROM hw_timetable_entries WHERE school_id = ${SCHOOL_ID} AND class_id = ${CLASS_ID} AND section_id = ${SECTION_ID} AND subject = 'Mathematics' AND weekday = 1)`;

    const noticeId = "00000000-0000-0000-0000-000000000116";
    const eventId = "00000000-0000-0000-0000-000000000117";
    await tx`INSERT INTO hw_notices (id, school_id, author_id, author_name, author_role, title, content, audience, target_classes) VALUES (${noticeId}, ${SCHOOL_ID}, ${USER_PRINCIPAL}, 'Priya Demo', 'principal', 'Welcome to the new academic year', 'Welcome to SHWAI Demo Academy. Please review the academic calendar and attendance policy.', ARRAY['student','parent','teacher','staff'], ARRAY['Grade 9']) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_calendar_events (id, school_id, title, description, event_type, starts_at, ends_at, audience, created_by) VALUES (${eventId}, ${SCHOOL_ID}, 'Parent orientation', 'Meet the Grade 9 teaching team.', 'ptm', '2026-08-28 15:30:00+05:30', '2026-08-28 16:30:00+05:30', ARRAY['parent','teacher'], ${USER_PRINCIPAL}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_notifications (school_id, recipient_id, title, body, severity, source_entity, source_id, created_by) SELECT ${SCHOOL_ID}, ${USER_STUDENT}, 'Homework graded', 'Your linear equations practice was graded: 18/20.', 'success', 'homework', ${HOMEWORK_ID}, ${TEACHER_ID} WHERE NOT EXISTS (SELECT 1 FROM hw_notifications WHERE school_id = ${SCHOOL_ID} AND recipient_id = ${USER_STUDENT} AND source_id = ${HOMEWORK_ID})`;
    await tx`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) SELECT ${SCHOOL_ID}, ${USER_PRINCIPAL}, 'Priya Demo', 'principal', 'seed', 'demo_school', ${SCHOOL_ID}, 'Fictional development seed installed' WHERE NOT EXISTS (SELECT 1 FROM hw_audit_events WHERE school_id = ${SCHOOL_ID} AND entity = 'demo_school' AND action = 'seed')`;

    await tx`INSERT INTO hw_ai_usage (school_id, user_id, role, feature, provider, model, request_id, input_chars, output_tokens, status) SELECT ${SCHOOL_ID}, ${USER_TEACHER}, 'teacher', 'content_studio', 'unavailable', 'unavailable', 'demo-ai-usage-1', 640, NULL, 'configuration_required' WHERE NOT EXISTS (SELECT 1 FROM hw_ai_usage WHERE request_id = 'demo-ai-usage-1')`;
    await tx`INSERT INTO hw_ai_content (id, school_id, created_by, content_type, subject, class_id, topic, title, payload, status, ai_generated, provider, model, request_id) VALUES ('00000000-0000-0000-0000-000000000118', ${SCHOOL_ID}, ${USER_TEACHER}, 'worksheet', 'Mathematics', ${CLASS_ID}, 'Linear equations', 'Linear equations revision worksheet', '{"questions":["Solve 2x+5=17","Explain the inverse operation"]}'::JSONB, 'draft', TRUE, 'unavailable', 'unavailable', 'demo-ai-content-1') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_tutor_sessions (id, school_id, student_id, topic, subject, class_label) VALUES (${TUTOR_SESSION_ID}, ${SCHOOL_ID}, ${STUDENT_ID}, 'Linear equations', 'Mathematics', 'Grade 9A') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_tutor_messages (session_id, school_id, student_id, role, content, hint_level) SELECT ${TUTOR_SESSION_ID}, ${SCHOOL_ID}, ${STUDENT_ID}, 'student', 'I am stuck on moving the constant to the other side.', 1 WHERE NOT EXISTS (SELECT 1 FROM hw_ai_tutor_messages WHERE session_id = ${TUTOR_SESSION_ID})`;
    await tx`INSERT INTO hw_ai_learning_events (school_id, student_id, feature, topic, activity_type, source_id, hints_requested, successful) SELECT ${SCHOOL_ID}, ${STUDENT_ID}, 'tutor', 'Linear equations', 'practice', ${TUTOR_SESSION_ID}, 1, TRUE WHERE NOT EXISTS (SELECT 1 FROM hw_ai_learning_events WHERE school_id = ${SCHOOL_ID} AND student_id = ${STUDENT_ID} AND source_id = ${TUTOR_SESSION_ID})`;

    await tx`INSERT INTO hw_intelligence_runs (id, school_id, window_days, status, triggered_by, records_examined, signals_created, alerts_created, data_quality, completed_at) VALUES (${INTELLIGENCE_RUN_ID}, ${SCHOOL_ID}, 30, 'completed', ${USER_PRINCIPAL}, 18, 1, 1, '{"attendance":"good","academic":"good","homework":"limited"}'::JSONB, NOW()) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_signals (id, run_id, school_id, student_id, category, code, label, observed_value, baseline_value, delta_value, direction, observation_start, observation_end, evidence_count, data_quality, explanation) VALUES (${SIGNAL_ID}, ${INTELLIGENCE_RUN_ID}, ${SCHOOL_ID}, ${STUDENT_ID}, 'attendance', 'late_pattern', 'Occasional late arrival', 1, 0, 1, 'up', '2026-08-01', '2026-08-20', 3, 'good', 'One late arrival in the recent attendance window; review context before action.') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_alerts (id, school_id, student_id, run_id, alert_type, title, summary, severity, confidence, confidence_reason, observation_start, observation_end, status, owner_id) VALUES (${ALERT_ID}, ${SCHOOL_ID}, ${STUDENT_ID}, ${INTELLIGENCE_RUN_ID}, 'attendance', 'Review recent late arrival', 'Aarav has one late arrival in the recent window.', 'attention', 'medium', 'Observed from three attendance records; no conclusion about future attendance is made.', '2026-08-01', '2026-08-20', 'new', ${USER_TEACHER}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_evidence (school_id, alert_id, signal_id, label, value, detail, source_entity, source_id) SELECT ${SCHOOL_ID}, ${ALERT_ID}, ${SIGNAL_ID}, 'Recent late arrivals', '1 of 3 records', 'Attendance records in the current observation window.', 'attendance', ${STUDENT_ID} WHERE NOT EXISTS (SELECT 1 FROM hw_intelligence_evidence WHERE alert_id = ${ALERT_ID})`;
    await tx`INSERT INTO hw_intelligence_recommendations (school_id, alert_id, action, rationale, priority, status) SELECT ${SCHOOL_ID}, ${ALERT_ID}, 'Discuss morning arrival barriers with the family', 'Use a human conversation to understand context before any intervention.', 'medium', 'suggested' WHERE NOT EXISTS (SELECT 1 FROM hw_intelligence_recommendations WHERE alert_id = ${ALERT_ID})`;
    await tx`INSERT INTO hw_interventions (id, school_id, alert_id, student_id, issue, evidence, recommended_action, owner_id, priority, status, created_by) VALUES (${INTERVENTION_ID}, ${SCHOOL_ID}, ${ALERT_ID}, ${STUDENT_ID}, 'Arrival routine check-in', 'One late arrival in three recent attendance records.', 'Teacher check-in with student and parent.', ${USER_TEACHER}, 'medium', 'new', ${USER_TEACHER}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_concepts (id, school_id, concept_key, label, subject, source_type, created_by) VALUES (${CONCEPT_ID}, ${SCHOOL_ID}, 'linear-equations', 'Linear equations', 'Mathematics', 'curriculum_admin', ${USER_PRINCIPAL}), (${DEPENDENT_CONCEPT_ID}, ${SCHOOL_ID}, 'simultaneous-equations', 'Simultaneous equations', 'Mathematics', 'curriculum_admin', ${USER_PRINCIPAL}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_prerequisites (school_id, prerequisite_concept_id, dependent_concept_id, created_by) VALUES (${SCHOOL_ID}, ${CONCEPT_ID}, ${DEPENDENT_CONCEPT_ID}, ${USER_PRINCIPAL}) ON CONFLICT (school_id, prerequisite_concept_id, dependent_concept_id) DO NOTHING`;
    await tx`INSERT INTO hw_intelligence_automation_rules (school_id, rule_key, trigger_type, enabled, recipient_role, action_type, configuration, created_by, updated_by) VALUES (${SCHOOL_ID}, 'demo-weekly-academic', 'weekly_academic', FALSE, 'teacher', 'scan', '{"windowDays":30}'::JSONB, ${USER_PRINCIPAL}, ${USER_PRINCIPAL}) ON CONFLICT (school_id, rule_key) DO NOTHING`;

    await tx`INSERT INTO hw_ai_provenance_records (id, school_id, output_type, output_id, request_id, provider, model, model_version, prompt_template, prompt_version, requested_by, learning_objective, difficulty, confidence, approval_status, output_version) VALUES (${PROVENANCE_ID}, ${SCHOOL_ID}, 'worksheet', '00000000-0000-0000-0000-000000000118', 'demo-v6-provenance-1', 'unavailable', 'unavailable', '', 'demo', 'v1', ${USER_TEACHER}, 'Practice solving linear equations', 'standard', 'unknown', 'pending_review', 1) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_output_versions (id, school_id, output_type, output_id, provenance_id, version_number, payload, created_by, status) VALUES (${OUTPUT_VERSION_ID}, ${SCHOOL_ID}, 'worksheet', '00000000-0000-0000-0000-000000000118', ${PROVENANCE_ID}, 1, '{"questions":["Solve 2x+5=17"]}'::JSONB, ${USER_TEACHER}, 'current') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_knowledge_sources (id, school_id, source_type, title, approval_state, approver_id, approved_at, version, active, metadata, created_by) VALUES (${KNOWLEDGE_SOURCE_ID}, ${SCHOOL_ID}, 'policy', 'Demo Academy attendance policy', 'approved', ${USER_PRINCIPAL}, NOW(), '1', TRUE, '{"fictional":true}'::JSONB, ${USER_PRINCIPAL}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_knowledge_chunks (id, school_id, source_id, chunk_index, content, content_hash, active, ingested_by, ingested_at) VALUES (${KNOWLEDGE_CHUNK_ID}, ${SCHOOL_ID}, ${KNOWLEDGE_SOURCE_ID}, 0, 'Students should arrive before the first bell and families should contact the office when an absence is expected.', 'demo-hash-attendance-policy', TRUE, ${USER_PRINCIPAL}, NOW()) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_predictions (id, school_id, prediction_type, target_entity_type, target_entity_id, prediction_value, confidence, provider, model, feature_snapshot, horizon, status, human_review_status, created_by) VALUES (${PREDICTION_ID}, ${SCHOOL_ID}, 'student_performance', 'student', ${STUDENT_ID}, NULL, 'unknown', 'unavailable', 'unavailable', '{"attendanceRecords":3,"gradeRecords":1}'::JSONB, 'term', 'insufficient_data', 'not_reviewed', ${USER_PRINCIPAL}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_warnings (school_id, prediction_id, warning_type, severity, detail, source) SELECT ${SCHOOL_ID}, ${PREDICTION_ID}, 'insufficient_data', 'attention', 'Demo seed intentionally has insufficient historical data for a prediction.', 'seed' WHERE NOT EXISTS (SELECT 1 FROM hw_ai_warnings WHERE prediction_id = ${PREDICTION_ID})`;
    await tx`INSERT INTO hw_ai_settings (school_id, enable_ai_tutor, enable_content_generation, enable_predictions, approved_providers, approved_knowledge_sources, human_review_required, role_permissions, updated_by) VALUES (${SCHOOL_ID}, TRUE, TRUE, FALSE, ARRAY[]::TEXT[], TRUE, TRUE, '{"teacher":["content_generation"],"student":["tutor"]}'::JSONB, ${USER_OWNER}) ON CONFLICT (school_id) DO NOTHING`;
    await tx`INSERT INTO hw_ai_learning_journeys (id, school_id, student_id, subject, concepts, current_mastery, prerequisite_gaps, recommended_next_concept, recommended_practice, revision_schedule, progress, updated_by) VALUES (${JOURNEY_ID}, ${SCHOOL_ID}, ${STUDENT_ID}, 'Mathematics', '[{"key":"linear-equations","mastery":0.84}]'::JSONB, '{"linear-equations":0.84}'::JSONB, '[]'::JSONB, 'simultaneous-equations', '[{"title":"Two-variable practice","difficulty":"standard"}]'::JSONB, '[{"date":"2026-08-25","topic":"Linear equations"}]'::JSONB, '{"activitiesCompleted":3,"observedAccuracy":0.84}'::JSONB, ${USER_TEACHER}) ON CONFLICT (id) DO UPDATE SET progress = EXCLUDED.progress, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  });
  await sql.end({ timeout: 5 });
  console.log(`Fictional demo seed complete. All local accounts use password: ${DEMO_PASSWORD}`);
}

seed().catch(async (error) => {
  console.error("Demo seed failed:", error instanceof Error ? error.message : "unknown error");
  await sql.end({ timeout: 5 });
  process.exit(1);
});
