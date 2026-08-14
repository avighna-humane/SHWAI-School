import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";

const OPERATIONS = ["staff", "admin", "principal", "owner"] as const;
const LEADERSHIP = ["admin", "principal", "owner"] as const;
const FINANCE = ["staff", "admin", "principal", "owner", "parent", "student"] as const;

async function audit(
  context: AuthContext,
  action: string,
  entity: string,
  entityId: string,
  detail: string,
) {
  const sql = requireDatabase();
  await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, ${action}, ${entity}, ${entityId}, ${detail})`;
}

const campusSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(1).max(30),
  address: z.string().trim().max(500).default(""),
});
export const listCampuses = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql`SELECT id, name, code, address, active, created_at FROM hw_campuses WHERE school_id = ${context.schoolId} ORDER BY name`;
});
export const createCampus = createServerFn({ method: "POST" })
  .validator(campusSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_campuses (school_id, name, code, address, created_by) VALUES (${context.schoolId}, ${data.name}, ${data.code}, ${data.address}, ${context.userId}) RETURNING id`;
    await audit(context, "create", "campus", rows[0]!.id, "Campus created");
    return { id: rows[0]!.id };
  });

const admissionEnquirySchema = z.object({
  applicantName: z.string().trim().min(2).max(180),
  guardianName: z.string().trim().max(180).default(""),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(40).default(""),
  gradeRequested: z.number().int().min(1).max(12).nullable().optional(),
  campusId: z.string().uuid().nullable().optional(),
  source: z.string().trim().max(80).default("direct"),
  notes: z.string().trim().max(2000).default(""),
});
const admissionApplicationSchema = z.object({
  enquiryId: z.string().uuid().nullable().optional(),
  applicantName: z.string().trim().min(2).max(180),
  guardianName: z.string().trim().max(180).default(""),
  gradeRequested: z.number().int().min(1).max(12).nullable().optional(),
  campusId: z.string().uuid().nullable().optional(),
  academicYearId: z.string().nullable().optional(),
});
const admissionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "APPLICATION_STARTED",
    "APPLICATION_SUBMITTED",
    "DOCUMENT_REVIEW",
    "ENTRANCE_TEST",
    "DECISION",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "ENROLLED",
  ]),
  decisionReason: z.string().trim().max(1500).default(""),
});
export const listAdmissions = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  return sql`SELECT a.id, a.applicant_name, a.guardian_name, a.grade_requested, a.status, a.decision_reason, a.created_at, a.updated_at, c.name AS campus_name FROM hw_admission_applications a LEFT JOIN hw_campuses c ON c.id = a.campus_id AND c.school_id = a.school_id WHERE a.school_id = ${context.schoolId} ORDER BY a.updated_at DESC LIMIT 300`;
});
export const createAdmissionEnquiry = createServerFn({ method: "POST" })
  .validator(admissionEnquirySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_admission_enquiries (school_id, campus_id, applicant_name, guardian_name, email, phone, grade_requested, source, notes, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.applicantName}, ${data.guardianName}, ${data.email}, ${data.phone}, ${data.gradeRequested ?? null}, ${data.source}, ${data.notes}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "admission_enquiry",
      rows[0]!.id,
      "Admission enquiry created without AI decisioning",
    );
    return { id: rows[0]!.id, status: "ENQUIRY" as const };
  });
export const createAdmissionApplication = createServerFn({ method: "POST" })
  .validator(admissionApplicationSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    if (data.campusId) {
      const campus =
        await sql`SELECT 1 FROM hw_campuses WHERE id = ${data.campusId} AND school_id = ${context.schoolId} AND active = TRUE`;
      if (!campus[0]) throw new Error("Campus is not available in this school");
    }
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_admission_applications (school_id, enquiry_id, applicant_name, guardian_name, campus_id, grade_requested, academic_year_id, created_by) VALUES (${context.schoolId}, ${data.enquiryId ?? null}, ${data.applicantName}, ${data.guardianName}, ${data.campusId ?? null}, ${data.gradeRequested ?? null}, ${data.academicYearId ?? null}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "admission_application",
      rows[0]!.id,
      "Admission application created; human review required",
    );
    return { id: rows[0]!.id, status: "APPLICATION_STARTED" as const };
  });
export const updateAdmissionStatus = createServerFn({ method: "POST" })
  .validator(admissionStatusSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_admission_applications SET status = ${data.status}, decision_reason = ${data.decisionReason}, updated_at = NOW() WHERE id = ${data.id} AND school_id = ${context.schoolId} RETURNING id`;
    if (!rows[0]) throw new Error("Admission application not found");
    await audit(
      context,
      "update",
      "admission_application",
      data.id,
      `Admission status changed to ${data.status}`,
    );
    return { id: data.id, status: data.status };
  });

const feeStructureSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.number().nonnegative(),
  grade: z.number().int().min(1).max(12).nullable().optional(),
  campusId: z.string().uuid().nullable().optional(),
  academicYearId: z.string().nullable().optional(),
  currency: z.string().length(3).default("INR"),
});
const feeAssignSchema = z.object({
  studentId: z.string().min(1),
  feeStructureId: z.string().uuid(),
  scholarshipAmount: z.number().nonnegative().default(0),
  concessionAmount: z.number().nonnegative().default(0),
  installments: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        dueDate: z.string().date(),
        amount: z.number().nonnegative(),
      }),
    )
    .min(1)
    .max(24),
});
const feePaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentReference: z.string().trim().min(2).max(160),
  paymentMethod: z.string().trim().min(2).max(40).default("manual"),
});
export const listFeeAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, FINANCE);
  const sql = requireDatabase();
  if (context.role === "parent")
    return sql`SELECT fa.id, fa.student_id, s.name AS student_name, fs.name AS fee_name, fs.amount, fa.scholarship_amount, fa.concession_amount, fa.status, COALESCE(SUM(fi.amount), 0) AS installment_total, COALESCE(SUM(fp.amount), 0) AS paid_total FROM hw_fee_assignments fa JOIN hw_students s ON s.id = fa.student_id AND s.school_id = fa.school_id JOIN hw_parent_students ps ON ps.student_id = fa.student_id AND ps.school_id = fa.school_id AND ps.active = TRUE JOIN hw_parents p ON p.id = ps.parent_id AND p.school_id = ps.school_id JOIN hw_fee_structures fs ON fs.id = fa.fee_structure_id AND fs.school_id = fa.school_id LEFT JOIN hw_fee_installments fi ON fi.assignment_id = fa.id AND fi.school_id = fa.school_id LEFT JOIN hw_fee_payments fp ON fp.installment_id = fi.id AND fp.school_id = fa.school_id WHERE fa.school_id = ${context.schoolId} AND p.user_id = ${context.userId} GROUP BY fa.id, s.name, fs.name, fs.amount ORDER BY s.name, fs.name`;
  if (context.role === "student")
    return sql`SELECT fa.id, fa.student_id, s.name AS student_name, fs.name AS fee_name, fs.amount, fa.scholarship_amount, fa.concession_amount, fa.status, COALESCE(SUM(fi.amount), 0) AS installment_total, COALESCE(SUM(fp.amount), 0) AS paid_total FROM hw_fee_assignments fa JOIN hw_students s ON s.id = fa.student_id AND s.user_id = ${context.userId} AND s.school_id = fa.school_id JOIN hw_fee_structures fs ON fs.id = fa.fee_structure_id AND fs.school_id = fa.school_id LEFT JOIN hw_fee_installments fi ON fi.assignment_id = fa.id AND fi.school_id = fa.school_id LEFT JOIN hw_fee_payments fp ON fp.installment_id = fi.id AND fp.school_id = fa.school_id WHERE fa.school_id = ${context.schoolId} GROUP BY fa.id, s.name, fs.name, fs.amount ORDER BY fs.name`;
  return sql`SELECT fa.id, fa.student_id, s.name AS student_name, fs.name AS fee_name, fs.amount, fa.scholarship_amount, fa.concession_amount, fa.status, COALESCE(SUM(fi.amount), 0) AS installment_total, COALESCE(SUM(fp.amount), 0) AS paid_total FROM hw_fee_assignments fa JOIN hw_students s ON s.id = fa.student_id AND s.school_id = fa.school_id JOIN hw_fee_structures fs ON fs.id = fa.fee_structure_id AND fs.school_id = fa.school_id LEFT JOIN hw_fee_installments fi ON fi.assignment_id = fa.id AND fi.school_id = fa.school_id LEFT JOIN hw_fee_payments fp ON fp.installment_id = fi.id AND fp.school_id = fa.school_id WHERE fa.school_id = ${context.schoolId} GROUP BY fa.id, s.name, fs.name, fs.amount ORDER BY s.name, fs.name LIMIT 500`;
});
export const createFeeStructure = createServerFn({ method: "POST" })
  .validator(feeStructureSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_fee_structures (school_id, campus_id, academic_year_id, name, grade, amount, currency, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.academicYearId ?? null}, ${data.name}, ${data.grade ?? null}, ${data.amount}, ${data.currency}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "fee_structure",
      rows[0]!.id,
      "Fee structure created; no payment was processed",
    );
    return { id: rows[0]!.id };
  });
export const assignFee = createServerFn({ method: "POST" })
  .validator(feeAssignSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId} AND status = 'active'`;
    if (!valid[0]) throw new Error("Student is not available in this school");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_fee_assignments (school_id, student_id, fee_structure_id, scholarship_amount, concession_amount, created_by) VALUES (${context.schoolId}, ${data.studentId}, ${data.feeStructureId}, ${data.scholarshipAmount}, ${data.concessionAmount}, ${context.userId}) RETURNING id`;
    for (const installment of data.installments)
      await sql`INSERT INTO hw_fee_installments (school_id, assignment_id, label, due_date, amount) VALUES (${context.schoolId}, ${rows[0]!.id}, ${installment.label}, ${installment.dueDate}, ${installment.amount})`;
    await audit(
      context,
      "create",
      "fee_assignment",
      rows[0]!.id,
      "Fee assignment and installments created",
    );
    return { id: rows[0]!.id };
  });
export const recordFeePayment = createServerFn({ method: "POST" })
  .validator(feePaymentSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_fee_installments WHERE id = ${data.installmentId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Installment not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_fee_payments (school_id, installment_id, amount, payment_reference, payment_method, created_by) VALUES (${context.schoolId}, ${data.installmentId}, ${data.amount}, ${data.paymentReference}, ${data.paymentMethod}, ${context.userId}) RETURNING id`;
    await sql`UPDATE hw_fee_installments SET status = CASE WHEN (SELECT COALESCE(SUM(amount),0) FROM hw_fee_payments WHERE installment_id = ${data.installmentId} AND school_id = ${context.schoolId} AND status = 'recorded') >= amount THEN 'PAID' WHEN (SELECT COALESCE(SUM(amount),0) FROM hw_fee_payments WHERE installment_id = ${data.installmentId} AND school_id = ${context.schoolId} AND status = 'recorded') > 0 THEN 'PARTIALLY_PAID' ELSE status END WHERE id = ${data.installmentId} AND school_id = ${context.schoolId}`;
    await audit(
      context,
      "create",
      "fee_payment",
      rows[0]!.id,
      `Payment reference recorded via ${data.paymentMethod}; no live provider assertion`,
    );
    return { id: rows[0]!.id, providerConfigured: false };
  });

const transportRouteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(1).max(40),
  campusId: z.string().uuid().nullable().optional(),
  providerKey: z.string().trim().max(120).default(""),
});
const transportEventSchema = z.object({
  routeId: z.string().uuid().nullable().optional(),
  studentId: z.string().nullable().optional(),
  eventType: z.enum(["pickup", "drop", "incident", "emergency"]),
  details: z.string().trim().max(1500).default(""),
  providerReference: z.string().trim().max(200).default(""),
});
export const listTransportRoutes = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql`SELECT r.id, r.name, r.code, r.provider_key, r.active, COUNT(DISTINCT a.student_id)::int AS assigned_students, CASE WHEN r.provider_key = '' THEN 'GPS integration not configured.' ELSE 'Provider boundary configured; live location still requires verification.' END AS provider_state FROM hw_transport_routes r LEFT JOIN hw_transport_assignments a ON a.route_id = r.id AND a.school_id = r.school_id AND a.active = TRUE WHERE r.school_id = ${context.schoolId} GROUP BY r.id ORDER BY r.name`;
});
export const createTransportRoute = createServerFn({ method: "POST" })
  .validator(transportRouteSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_transport_routes (school_id, campus_id, name, code, provider_key, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.name}, ${data.code}, ${data.providerKey}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "transport_route",
      rows[0]!.id,
      "Transport route created without fabricated GPS data",
    );
    return { id: rows[0]!.id, gpsConfigured: Boolean(data.providerKey) };
  });
export const recordTransportEvent = createServerFn({ method: "POST" })
  .validator(transportEventSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_transport_events (school_id, route_id, student_id, event_type, details, provider_reference, created_by) VALUES (${context.schoolId}, ${data.routeId ?? null}, ${data.studentId ?? null}, ${data.eventType}, ${data.details}, ${data.providerReference}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      data.eventType === "emergency" ? "emergency" : "create",
      "transport_event",
      rows[0]!.id,
      "Transport event recorded and scoped to the school",
    );
    return { id: rows[0]!.id };
  });

const libraryBookSchema = z.object({
  title: z.string().trim().min(2).max(240),
  author: z.string().trim().max(180).default(""),
  isbn: z.string().trim().max(40).default(""),
  category: z.string().trim().max(120).default(""),
  barcode: z.string().trim().min(2).max(80),
});
export const listLibrary = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql`SELECT b.id, b.title, b.author, b.isbn, b.category, COUNT(c.id)::int AS copies, COUNT(c.id) FILTER (WHERE c.status = 'available')::int AS available_copies FROM hw_library_books b LEFT JOIN hw_library_copies c ON c.book_id = b.id AND c.school_id = b.school_id WHERE b.school_id = ${context.schoolId} GROUP BY b.id ORDER BY b.title LIMIT 500`;
});
export const createLibraryBook = createServerFn({ method: "POST" })
  .validator(libraryBookSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const books = await sql<
      { id: string }[]
    >`INSERT INTO hw_library_books (school_id, isbn, title, author, category, created_by) VALUES (${context.schoolId}, ${data.isbn}, ${data.title}, ${data.author}, ${data.category}, ${context.userId}) RETURNING id`;
    await sql`INSERT INTO hw_library_copies (school_id, book_id, barcode) VALUES (${context.schoolId}, ${books[0]!.id}, ${data.barcode})`;
    await audit(context, "create", "library_book", books[0]!.id, "Book and copy created");
    return { id: books[0]!.id };
  });
const checkoutSchema = z.object({
  copyId: z.string().uuid(),
  borrowerId: z.string().min(1),
  dueAt: z.string().date(),
});
export const checkoutLibraryCopy = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const copy = await sql<
      { id: string }[]
    >`UPDATE hw_library_copies SET status = 'loaned' WHERE id = ${data.copyId} AND school_id = ${context.schoolId} AND status = 'available' RETURNING id`;
    if (!copy[0]) throw new Error("Copy is unavailable or already loaned");
    const loans = await sql<
      { id: string }[]
    >`INSERT INTO hw_library_loans (school_id, copy_id, borrower_id, due_at, created_by) VALUES (${context.schoolId}, ${data.copyId}, ${data.borrowerId}, ${data.dueAt}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "library_loan",
      loans[0]!.id,
      "Library copy checked out with availability guard",
    );
    return { id: loans[0]!.id };
  });
const returnSchema = z.object({ loanId: z.string().uuid() });
export const returnLibraryCopy = createServerFn({ method: "POST" })
  .validator(returnSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const loans = await sql<
      { copy_id: string }[]
    >`UPDATE hw_library_loans SET returned_at = NOW(), status = 'returned' WHERE id = ${data.loanId} AND school_id = ${context.schoolId} AND status IN ('active','overdue') RETURNING copy_id`;
    if (!loans[0]) throw new Error("Loan not found or already returned");
    await sql`UPDATE hw_library_copies SET status = 'available' WHERE id = ${loans[0].copy_id} AND school_id = ${context.schoolId}`;
    await audit(context, "update", "library_loan", data.loanId, "Library copy returned");
    return { returned: true };
  });

const inventoryItemSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().max(120).default(""),
  quantity: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  location: z.string().trim().max(160).default(""),
  campusId: z.string().uuid().nullable().optional(),
});
const inventoryMovementSchema = z.object({
  itemId: z.string().uuid(),
  movementType: z.enum(["purchase", "issue", "return", "adjustment"]),
  quantity: z.number().positive(),
  reference: z.string().trim().max(200).default(""),
});
export const listInventory = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  return sql`SELECT id, sku, name, category, quantity, reorder_level, location, CASE WHEN quantity <= reorder_level THEN TRUE ELSE FALSE END AS reorder_alert FROM hw_inventory_items WHERE school_id = ${context.schoolId} AND active = TRUE ORDER BY name`;
});
export const createInventoryItem = createServerFn({ method: "POST" })
  .validator(inventoryItemSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_inventory_items (school_id, campus_id, sku, name, category, quantity, reorder_level, location, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.sku}, ${data.name}, ${data.category}, ${data.quantity}, ${data.reorderLevel}, ${data.location}, ${context.userId}) RETURNING id`;
    await audit(context, "create", "inventory_item", rows[0]!.id, "Inventory item created");
    return { id: rows[0]!.id };
  });
export const recordInventoryMovement = createServerFn({ method: "POST" })
  .validator(inventoryMovementSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const direction = data.movementType === "issue" ? -1 : 1;
    const updated = await sql<
      { id: string }[]
    >`UPDATE hw_inventory_items SET quantity = quantity + (${direction} * ${data.quantity}) WHERE id = ${data.itemId} AND school_id = ${context.schoolId} AND quantity + (${direction} * ${data.quantity}) >= 0 RETURNING id`;
    if (!updated[0])
      throw new Error("Movement would create negative inventory or item is unavailable");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_inventory_movements (school_id, item_id, movement_type, quantity, reference, created_by) VALUES (${context.schoolId}, ${data.itemId}, ${data.movementType}, ${data.quantity}, ${data.reference}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "inventory_movement",
      rows[0]!.id,
      `Inventory ${data.movementType} movement recorded`,
    );
    return { id: rows[0]!.id };
  });

const facilitySchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).default(""),
});
export const listFacilities = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  return sql`SELECT f.id, f.title, f.description, f.status, f.assigned_to, f.created_at, r.name AS room_name FROM hw_facilities_requests f LEFT JOIN hw_facilities_rooms r ON r.id = f.room_id AND r.school_id = f.school_id WHERE f.school_id = ${context.schoolId} ORDER BY f.updated_at DESC LIMIT 300`;
});
export const createFacilityRequest = createServerFn({ method: "POST" })
  .validator(facilitySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_facilities_requests (school_id, room_id, title, description, created_by) VALUES (${context.schoolId}, ${data.roomId ?? null}, ${data.title}, ${data.description}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "facility_request",
      rows[0]!.id,
      "Facility maintenance request created",
    );
    return { id: rows[0]!.id, status: "OPEN" as const };
  });
const facilityStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedTo: z.string().nullable().optional(),
});
export const updateFacilityRequest = createServerFn({ method: "POST" })
  .validator(facilityStatusSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_facilities_requests SET status = ${data.status}, assigned_to = COALESCE(${data.assignedTo ?? null}, assigned_to), updated_at = NOW() WHERE id = ${data.id} AND school_id = ${context.schoolId} RETURNING id`;
    if (!rows[0]) throw new Error("Facility request not found");
    await audit(
      context,
      "update",
      "facility_request",
      data.id,
      `Facility status changed to ${data.status}`,
    );
    return { id: data.id, status: data.status };
  });

const providerSchema = z.object({
  providerType: z.enum(["payment", "gps", "sms", "whatsapp", "payroll", "storage", "translation"]),
  enabled: z.boolean(),
  configurationStatus: z.enum(["not_configured", "configured", "verified", "failed"]),
  publicLabel: z.string().trim().max(160).default(""),
  secretReference: z.string().trim().max(160).default(""),
});
export const listV5ProviderConfigs = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, LEADERSHIP);
  const sql = requireDatabase();
  return sql`SELECT id, provider_type, enabled, configuration_status, public_label, updated_at FROM hw_v5_provider_configs WHERE school_id = ${context.schoolId} ORDER BY provider_type`;
});
export const upsertV5ProviderConfig = createServerFn({ method: "POST" })
  .validator(providerSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, LEADERSHIP);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_v5_provider_configs (school_id, provider_type, enabled, configuration_status, public_label, secret_reference, updated_by) VALUES (${context.schoolId}, ${data.providerType}, ${data.enabled}, ${data.configurationStatus}, ${data.publicLabel}, ${data.secretReference}, ${context.userId}) ON CONFLICT (school_id, provider_type) DO UPDATE SET enabled = EXCLUDED.enabled, configuration_status = EXCLUDED.configuration_status, public_label = EXCLUDED.public_label, secret_reference = EXCLUDED.secret_reference, updated_by = EXCLUDED.updated_by, updated_at = NOW() RETURNING id`;
    await audit(
      context,
      "update",
      "provider_config",
      rows[0]!.id,
      `Provider ${data.providerType} configuration state updated`,
    );
    return { id: rows[0]!.id, configurationStatus: data.configurationStatus };
  });

const offlineSchema = z.object({
  operationId: z.string().min(8).max(120),
  entity: z.string().min(1).max(120),
  entityId: z.string().min(1).max(120),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.unknown()).default({}),
  localVersion: z.string().max(120).default(""),
});
export const recordOfflineOperation = createServerFn({ method: "POST" })
  .validator(offlineSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<
      { id: string; status: string }[]
    >`INSERT INTO hw_offline_operations (school_id, operation_id, actor_id, entity, entity_id, operation, payload, local_version) VALUES (${context.schoolId}, ${data.operationId}, ${context.userId}, ${data.entity}, ${data.entityId}, ${data.operation}, ${JSON.stringify(data.payload)}::JSONB, ${data.localVersion}) ON CONFLICT (school_id, operation_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW() RETURNING id, status`;
    await audit(
      context,
      "offline_queue",
      "offline_operation",
      rows[0]!.id,
      `Offline ${data.operation} queued for ${data.entity}`,
    );
    return rows[0]!;
  });
export const listOfflineOperations = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql`SELECT id, operation_id, entity, entity_id, operation, payload, local_version, status, error_message, created_at, updated_at FROM hw_offline_operations WHERE school_id = ${context.schoolId} AND actor_id = ${context.userId} ORDER BY created_at DESC LIMIT 200`;
});
const offlineResolveSchema = z.object({
  id: z.string().uuid(),
  resolution: z.enum(["accept_server", "accept_local", "manual_merge"]),
  mergedPayload: z.record(z.unknown()).default({}),
});
export const resolveOfflineConflict = createServerFn({ method: "POST" })
  .validator(offlineResolveSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_offline_operations SET status = 'SYNCED', payload = ${JSON.stringify(data.mergedPayload)}::JSONB, error_message = ${`Resolved with ${data.resolution}`}, updated_at = NOW() WHERE id = ${data.id} AND school_id = ${context.schoolId} AND status = 'CONFLICT' RETURNING id`;
    if (!rows[0]) throw new Error("Offline conflict not found");
    await audit(
      context,
      "conflict_resolution",
      "offline_operation",
      data.id,
      `Offline conflict resolved with ${data.resolution}`,
    );
    return { id: data.id, status: "SYNCED" as const };
  });

export const getV5OperationsSummary = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  const [admissions, fees, transport, library, inventory, facilities, workload, debt, experiments] =
    await Promise.all([
      sql`SELECT status, COUNT(*)::int AS count FROM hw_admission_applications WHERE school_id = ${context.schoolId} GROUP BY status`,
      sql`SELECT status, COUNT(*)::int AS count FROM hw_fee_assignments WHERE school_id = ${context.schoolId} GROUP BY status`,
      sql`SELECT COUNT(*)::int AS routes, COUNT(*) FILTER (WHERE provider_key <> '')::int AS configured_routes FROM hw_transport_routes WHERE school_id = ${context.schoolId} AND active = TRUE`,
      sql`SELECT COUNT(*)::int AS books, COUNT(*) FILTER (WHERE status = 'loaned')::int AS active_loans FROM hw_library_copies WHERE school_id = ${context.schoolId}`,
      sql`SELECT COUNT(*)::int AS items, COUNT(*) FILTER (WHERE quantity <= reorder_level)::int AS reorder_alerts FROM hw_inventory_items WHERE school_id = ${context.schoolId} AND active = TRUE`,
      sql`SELECT status, COUNT(*)::int AS count FROM hw_facilities_requests WHERE school_id = ${context.schoolId} GROUP BY status`,
      sql`SELECT COUNT(*)::int AS tasks, COALESCE(SUM(estimated_minutes), 0)::int AS estimated_minutes FROM hw_workload_tasks WHERE school_id = ${context.schoolId} AND status <> 'cancelled'`,
      sql`SELECT severity, COUNT(*)::int AS count FROM hw_learning_debt_records WHERE school_id = ${context.schoolId} AND status = 'open' GROUP BY severity`,
      sql`SELECT status, COUNT(*)::int AS count FROM hw_intervention_experiments WHERE school_id = ${context.schoolId} GROUP BY status`,
    ]);
  return {
    admissions,
    fees,
    transport,
    library,
    inventory,
    facilities,
    workload,
    debt,
    experiments,
    providerNotice:
      "External payment, GPS, messaging, payroll, storage, and translation delivery remain configuration-dependent.",
  };
});

const staffAssignmentSchema = z.object({
  staffId: z.string().min(1),
  campusId: z.string().uuid().nullable().optional(),
  assignmentType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(2).max(180),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  estimatedMinutes: z.number().int().nonnegative().default(0),
});
export const createStaffAssignment = createServerFn({ method: "POST" })
  .validator(staffAssignmentSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_staff_assignments (school_id, campus_id, staff_id, assignment_type, title, starts_at, ends_at, estimated_minutes, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.staffId}, ${data.assignmentType}, ${data.title}, ${data.startsAt ?? null}, ${data.endsAt ?? null}, ${data.estimatedMinutes}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "staff_assignment",
      rows[0]!.id,
      "Staff assignment created as an operational record",
    );
    return { id: rows[0]!.id };
  });
export const listStaffAssignments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  return sql`SELECT id, staff_id, assignment_type, title, starts_at, ends_at, estimated_minutes, status FROM hw_staff_assignments WHERE school_id = ${context.schoolId} AND status <> 'cancelled' ORDER BY starts_at NULLS LAST LIMIT 500`;
});

const roomSchema = z.object({
  campusId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  roomType: z.string().trim().min(2).max(80).default("classroom"),
  capacity: z.number().int().nonnegative(),
});
export const createFacilityRoom = createServerFn({ method: "POST" })
  .validator(roomSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_facilities_rooms (school_id, campus_id, name, room_type, capacity, created_by) VALUES (${context.schoolId}, ${data.campusId ?? null}, ${data.name}, ${data.roomType}, ${data.capacity}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "facility_room",
      rows[0]!.id,
      "Facility room created with capacity metadata",
    );
    return { id: rows[0]!.id };
  });
export const listFacilityRooms = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, OPERATIONS);
  const sql = requireDatabase();
  return sql`SELECT id, name, room_type, capacity, active FROM hw_facilities_rooms WHERE school_id = ${context.schoolId} AND active = TRUE ORDER BY name`;
});

const certificateSchema = z.object({
  studentId: z.string().min(1),
  certificateType: z.string().trim().min(2).max(120),
  issueDate: z.string().date(),
  verificationIdentifier: z.string().trim().max(160).default(""),
  artifactReference: z.string().trim().max(200).default(""),
});
export const createCertificateRecord = createServerFn({ method: "POST" })
  .validator(certificateSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const student =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}`;
    if (!student[0]) throw new Error("Student is not available in this school");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_certificates (school_id, student_id, certificate_type, issue_date, issuer_id, verification_identifier, artifact_reference) VALUES (${context.schoolId}, ${data.studentId}, ${data.certificateType}, ${data.issueDate}, ${context.userId}, ${data.verificationIdentifier}, ${data.artifactReference}) RETURNING id`;
    await audit(
      context,
      "create",
      "certificate",
      rows[0]!.id,
      data.artifactReference
        ? "Certificate record linked to provided artifact reference"
        : "Certificate record created without fake downloadable artifact",
    );
    return { id: rows[0]!.id, artifactConfigured: Boolean(data.artifactReference) };
  });
export const listCertificates = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student")
    return sql`SELECT c.id, c.certificate_type, c.issue_date, c.status, c.verification_identifier FROM hw_certificates c JOIN hw_students s ON s.id = c.student_id AND s.school_id = c.school_id AND s.user_id = ${context.userId} WHERE c.school_id = ${context.schoolId} ORDER BY c.issue_date DESC`;
  requireRole(context, OPERATIONS);
  return sql`SELECT c.id, c.student_id, s.name AS student_name, c.certificate_type, c.issue_date, c.status, c.verification_identifier, c.artifact_reference FROM hw_certificates c JOIN hw_students s ON s.id = c.student_id AND s.school_id = c.school_id WHERE c.school_id = ${context.schoolId} ORDER BY c.issue_date DESC LIMIT 500`;
});

const admissionDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.string().trim().min(2).max(120),
  fileReference: z.string().trim().max(240).default(""),
  status: z.enum(["requested", "received", "reviewed", "rejected"]).default("received"),
  reviewNotes: z.string().trim().max(1200).default(""),
});
export const recordAdmissionDocument = createServerFn({ method: "POST" })
  .validator(admissionDocumentSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_admission_applications WHERE id = ${data.applicationId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Admission application not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_admission_documents (school_id, application_id, document_type, file_reference, status, review_notes, created_by) VALUES (${context.schoolId}, ${data.applicationId}, ${data.documentType}, ${data.fileReference}, ${data.status}, ${data.reviewNotes}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "admission_document",
      rows[0]!.id,
      data.fileReference
        ? "Document metadata recorded with file reference"
        : "Document metadata recorded; storage provider not asserted",
    );
    return { id: rows[0]!.id, storageConfigured: Boolean(data.fileReference) };
  });
const admissionTestSchema = z.object({
  applicationId: z.string().uuid(),
  subject: z.string().trim().min(2).max(120),
  scheduledAt: z.string().datetime().nullable().optional(),
  score: z.number().nullable().optional(),
  result: z.enum(["pending", "pass", "fail", "absent"]).default("pending"),
  notes: z.string().trim().max(1200).default(""),
});
export const recordAdmissionTest = createServerFn({ method: "POST" })
  .validator(admissionTestSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_admission_applications WHERE id = ${data.applicationId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Admission application not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_admission_tests (school_id, application_id, subject, scheduled_at, score, result, notes, created_by) VALUES (${context.schoolId}, ${data.applicationId}, ${data.subject}, ${data.scheduledAt ?? null}, ${data.score ?? null}, ${data.result}, ${data.notes}, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "admission_test",
      rows[0]!.id,
      "Entrance-test record saved; no AI admission decision",
    );
    return { id: rows[0]!.id };
  });
const admissionFollowupSchema = z
  .object({
    enquiryId: z.string().uuid().nullable().optional(),
    applicationId: z.string().uuid().nullable().optional(),
    dueAt: z.string().datetime(),
    ownerId: z.string().min(1),
    notes: z.string().trim().max(1200).default(""),
  })
  .refine(
    (data) => Boolean(data.enquiryId || data.applicationId),
    "An enquiry or application is required",
  );
export const createAdmissionFollowup = createServerFn({ method: "POST" })
  .validator(admissionFollowupSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_admission_followups (school_id, enquiry_id, application_id, due_at, owner_id, notes) VALUES (${context.schoolId}, ${data.enquiryId ?? null}, ${data.applicationId ?? null}, ${data.dueAt}, ${data.ownerId}, ${data.notes}) RETURNING id`;
    await audit(
      context,
      "create",
      "admission_followup",
      rows[0]!.id,
      "Admission follow-up scheduled",
    );
    return { id: rows[0]!.id };
  });

const transportAssignmentSchema = z.object({
  studentId: z.string().min(1),
  routeId: z.string().uuid(),
  stopId: z.string().uuid().nullable().optional(),
});
export const assignStudentTransport = createServerFn({ method: "POST" })
  .validator(transportAssignmentSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, OPERATIONS);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_students s JOIN hw_transport_routes r ON r.school_id = s.school_id WHERE s.id = ${data.studentId} AND s.school_id = ${context.schoolId} AND r.id = ${data.routeId} AND r.school_id = ${context.schoolId} AND r.active = TRUE`;
    if (!valid[0]) throw new Error("Student or route is not available in this school");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_transport_assignments (school_id, student_id, route_id, stop_id, created_by) VALUES (${context.schoolId}, ${data.studentId}, ${data.routeId}, ${data.stopId ?? null}, ${context.userId}) ON CONFLICT (school_id, student_id, route_id) DO UPDATE SET stop_id = EXCLUDED.stop_id, active = TRUE RETURNING id`;
    await audit(
      context,
      "update",
      "transport_assignment",
      rows[0]!.id,
      "Student transport assignment saved",
    );
    return { id: rows[0]!.id };
  });
export const listLibraryLoans = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student")
    return sql`SELECT l.id, b.title, c.barcode, l.borrowed_at, l.due_at, l.returned_at, l.status FROM hw_library_loans l JOIN hw_library_copies c ON c.id = l.copy_id AND c.school_id = l.school_id JOIN hw_library_books b ON b.id = c.book_id AND b.school_id = l.school_id JOIN hw_students s ON s.id = l.borrower_id AND s.user_id = ${context.userId} AND s.school_id = l.school_id WHERE l.school_id = ${context.schoolId} ORDER BY l.borrowed_at DESC LIMIT 200`;
  requireRole(context, OPERATIONS);
  return sql`SELECT l.id, l.borrower_id, b.title, c.barcode, l.borrowed_at, l.due_at, l.returned_at, l.status FROM hw_library_loans l JOIN hw_library_copies c ON c.id = l.copy_id AND c.school_id = l.school_id JOIN hw_library_books b ON b.id = c.book_id AND b.school_id = l.school_id WHERE l.school_id = ${context.schoolId} ORDER BY l.borrowed_at DESC LIMIT 500`;
});
