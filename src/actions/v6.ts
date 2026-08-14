import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { AiConfigurationError, generateText } from "@/lib/ai/provider";
import {
  assertInputSize,
  assertPromptSafe,
  enforceAiUsage,
  normalizeAiError,
  recordAiAudit,
  recordAiUsage,
} from "@/lib/ai/policy";
import {
  canManageV6Governance,
  canRequestPrediction,
  canReviewAiOutput,
  canTransitionApproval,
  knowledgeAnswerState,
  predictionAvailability,
  warningForDataQuality,
  type ApprovalStatus,
} from "@/lib/v6/policy";

const GOVERNANCE = ["admin", "principal", "owner"] as const;
const STAFF = ["teacher", "staff", "admin", "principal", "owner"] as const;
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

const provenanceSchema = z.object({
  outputType: z.string().trim().min(2).max(120),
  outputId: z.string().max(160).default(""),
  requestId: z.string().min(8).max(160),
  provider: z.string().max(120),
  model: z.string().max(160),
  modelVersion: z.string().max(160).default(""),
  promptTemplate: z.string().max(160).default(""),
  promptVersion: z.string().max(80).default(""),
  sourceRecordIds: z.array(z.string().max(160)).max(100).default([]),
  sourceDocumentIds: z.array(z.string().uuid()).max(100).default([]),
  sourceCurriculumIds: z.array(z.string().uuid()).max(100).default([]),
  learningObjective: z.string().max(500).default(""),
  difficulty: z.string().max(80).default(""),
  confidence: z.string().max(80).default("unknown"),
  uncertainty: z.record(z.unknown()).default({}),
  missingData: z.array(z.unknown()).max(50).default([]),
  biasWarnings: z.array(z.unknown()).max(50).default([]),
  approvalStatus: z
    .enum(["draft", "generated", "pending_review", "approved", "rejected", "revised", "superseded"])
    .default("generated"),
  parentProvenanceId: z.string().uuid().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
  editedByHuman: z.boolean().default(false),
});
export const createV6Provenance = createServerFn({ method: "POST" })
  .validator(provenanceSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    const rows = await sql<
      { id: string; output_version: number }[]
    >`INSERT INTO hw_ai_provenance_records (school_id, output_type, output_id, request_id, provider, model, model_version, prompt_template, prompt_version, requested_by, source_record_ids, source_document_ids, source_curriculum_ids, learning_objective, difficulty, confidence, uncertainty, missing_data, bias_warnings, approval_status, parent_provenance_id) VALUES (${context.schoolId}, ${data.outputType}, ${data.outputId}, ${data.requestId}, ${data.provider}, ${data.model}, ${data.modelVersion}, ${data.promptTemplate}, ${data.promptVersion}, ${context.userId}, ${data.sourceRecordIds}, ${data.sourceDocumentIds}, ${data.sourceCurriculumIds}, ${data.learningObjective}, ${data.difficulty}, ${data.confidence}, ${JSON.stringify(data.uncertainty)}::JSONB, ${JSON.stringify(data.missingData)}::JSONB, ${JSON.stringify(data.biasWarnings)}::JSONB, ${data.approvalStatus}, ${data.parentProvenanceId ?? null}) RETURNING id, output_version`;
    await sql`INSERT INTO hw_ai_output_versions (school_id, output_type, output_id, provenance_id, version_number, payload, edited_by_human, created_by) VALUES (${context.schoolId}, ${data.outputType}, ${data.outputId}, ${rows[0]!.id}, ${rows[0]!.output_version}, ${JSON.stringify(data.payload)}::JSONB, ${data.editedByHuman}, ${context.userId})`;
    await audit(
      context,
      "create",
      "ai_provenance",
      rows[0]!.id,
      `Provenance recorded for ${data.outputType}`,
    );
    return {
      id: rows[0]!.id,
      version: rows[0]!.output_version,
      approvalStatus: data.approvalStatus,
    };
  });
export const listV6Provenance = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  return sql`SELECT p.id, p.output_type, p.output_id, p.provider, p.model, p.prompt_template, p.requested_by, p.confidence, p.uncertainty, p.missing_data, p.bias_warnings, p.approval_status, p.reviewer_id, p.reviewed_at, p.output_version, p.created_at, u.name AS requester_name FROM hw_ai_provenance_records p LEFT JOIN hw_users u ON u.id = p.requested_by WHERE p.school_id = ${context.schoolId} ORDER BY p.created_at DESC LIMIT 300`;
});
export const listV6OutputVersions = createServerFn({ method: "GET" })
  .validator(z.object({ outputType: z.string().min(1), outputId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    const sql = requireDatabase();
    return sql`SELECT v.id, v.version_number, v.payload, v.edited_by_human, v.created_by, v.status, v.created_at, p.provider, p.model, p.approval_status FROM hw_ai_output_versions v JOIN hw_ai_provenance_records p ON p.id = v.provenance_id AND p.school_id = v.school_id WHERE v.school_id = ${context.schoolId} AND v.output_type = ${data.outputType} AND v.output_id = ${data.outputId} ORDER BY v.version_number DESC`;
  });
const reviewSchema = z.object({
  provenanceId: z.string().uuid(),
  newStatus: z.enum(["pending_review", "approved", "rejected", "revised", "superseded"]),
  reviewNote: z.string().trim().max(2000).default(""),
});
export const reviewV6Provenance = createServerFn({ method: "POST" })
  .validator(reviewSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canReviewAiOutput(context.role)) throw new Error("Permission denied for AI output review");
    const sql = requireDatabase();
    const rows = await sql<
      { id: string; approval_status: ApprovalStatus }[]
    >`SELECT id, approval_status FROM hw_ai_provenance_records WHERE id = ${data.provenanceId} AND school_id = ${context.schoolId}`;
    const current = rows[0];
    if (!current) throw new Error("AI provenance record not found");
    if (!canTransitionApproval(current.approval_status, data.newStatus))
      throw new Error(
        `Invalid approval transition from ${current.approval_status} to ${data.newStatus}`,
      );
    await sql`UPDATE hw_ai_provenance_records SET approval_status = ${data.newStatus}, reviewer_id = ${context.userId}, reviewed_at = NOW(), review_note = ${data.reviewNote} WHERE id = ${data.provenanceId} AND school_id = ${context.schoolId}`;
    await sql`INSERT INTO hw_ai_approval_events (school_id, provenance_id, previous_status, new_status, reviewer_id, review_note) VALUES (${context.schoolId}, ${data.provenanceId}, ${current.approval_status}, ${data.newStatus}, ${context.userId}, ${data.reviewNote})`;
    await audit(
      context,
      "review",
      "ai_provenance",
      data.provenanceId,
      `AI approval moved from ${current.approval_status} to ${data.newStatus}`,
    );
    return {
      id: data.provenanceId,
      previousStatus: current.approval_status,
      status: data.newStatus,
    };
  });

const sourceSchema = z.object({
  documentId: z.string().uuid().nullable().optional(),
  sourceType: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(240),
  version: z.string().trim().max(80).default("1"),
  metadata: z.record(z.unknown()).default({}),
});
export const registerKnowledgeSource = createServerFn({ method: "POST" })
  .validator(sourceSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canManageV6Governance(context.role))
      throw new Error("Only school governance roles can register knowledge sources");
    const sql = requireDatabase();
    if (data.documentId) {
      const doc =
        await sql`SELECT 1 FROM hw_documents WHERE id = ${data.documentId} AND school_id = ${context.schoolId}`;
      if (!doc[0]) throw new Error("Document is not available in this school");
    }
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_knowledge_sources (school_id, document_id, source_type, title, version, metadata, created_by) VALUES (${context.schoolId}, ${data.documentId ?? null}, ${data.sourceType}, ${data.title}, ${data.version}, ${JSON.stringify(data.metadata)}::JSONB, ${context.userId}) RETURNING id`;
    await audit(
      context,
      "create",
      "ai_knowledge_source",
      rows[0]!.id,
      "Knowledge source registered pending human approval",
    );
    return { id: rows[0]!.id, approvalState: "pending_review" as const };
  });
const sourceStateSchema = z.object({
  sourceId: z.string().uuid(),
  approvalState: z.enum(["approved", "pending_review", "rejected", "archived"]),
});
export const reviewKnowledgeSource = createServerFn({ method: "POST" })
  .validator(sourceStateSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canManageV6Governance(context.role))
      throw new Error("Only school governance roles can approve knowledge sources");
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_ai_knowledge_sources SET approval_state = ${data.approvalState}, approver_id = ${context.userId}, approved_at = CASE WHEN ${data.approvalState} = 'approved' THEN NOW() ELSE approved_at END, active = ${data.approvalState} <> 'archived' WHERE id = ${data.sourceId} AND school_id = ${context.schoolId} RETURNING id`;
    if (!rows[0]) throw new Error("Knowledge source not found");
    await audit(
      context,
      "review",
      "ai_knowledge_source",
      data.sourceId,
      `Knowledge source state changed to ${data.approvalState}`,
    );
    return { id: data.sourceId, approvalState: data.approvalState };
  });
const chunkSchema = z.object({
  sourceId: z.string().uuid(),
  chunkIndex: z.number().int().nonnegative(),
  content: z.string().trim().min(20).max(12000),
  embeddingReference: z.string().max(240).default(""),
});
export const ingestKnowledgeChunk = createServerFn({ method: "POST" })
  .validator(chunkSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canManageV6Governance(context.role))
      throw new Error("Only school governance roles can ingest knowledge chunks");
    const sql = requireDatabase();
    const source =
      await sql`SELECT 1 FROM hw_ai_knowledge_sources WHERE id = ${data.sourceId} AND school_id = ${context.schoolId}`;
    if (!source[0]) throw new Error("Knowledge source not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_knowledge_chunks (school_id, source_id, chunk_index, content, embedding_reference) VALUES (${context.schoolId}, ${data.sourceId}, ${data.chunkIndex}, ${data.content}, ${data.embeddingReference}) ON CONFLICT (source_id, chunk_index) DO UPDATE SET content = EXCLUDED.content, embedding_reference = EXCLUDED.embedding_reference, active = TRUE RETURNING id`;
    await audit(context, "write", "ai_knowledge_chunk", rows[0]!.id, "Knowledge chunk ingested");
    return { id: rows[0]!.id };
  });
export const listKnowledgeSources = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  return sql`SELECT s.id, s.title, s.source_type, s.approval_state, s.version, s.active, s.approver_id, s.approved_at, COUNT(c.id)::int AS chunk_count FROM hw_ai_knowledge_sources s LEFT JOIN hw_ai_knowledge_chunks c ON c.source_id = s.id AND c.school_id = s.school_id AND c.active = TRUE WHERE s.school_id = ${context.schoolId} GROUP BY s.id ORDER BY s.created_at DESC LIMIT 300`;
});

const knowledgeQuerySchema = z.object({ query: z.string().trim().min(3).max(2000) });
export const searchApprovedKnowledge = createServerFn({ method: "POST" })
  .validator(knowledgeQuerySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, STAFF);
    assertInputSize(data.query);
    assertPromptSafe(data.query);
    const sql = requireDatabase();
    return sql`SELECT c.id AS chunk_id, c.source_id, s.title, s.source_type, c.content, c.chunk_index FROM hw_ai_knowledge_chunks c JOIN hw_ai_knowledge_sources s ON s.id = c.source_id AND s.school_id = c.school_id WHERE c.school_id = ${context.schoolId} AND c.active = TRUE AND s.active = TRUE AND s.approval_state = 'approved' AND (c.content ILIKE ${`%${data.query}%`} OR s.title ILIKE ${`%${data.query}%`}) ORDER BY CASE WHEN s.title ILIKE ${`%${data.query}%`} THEN 0 ELSE 1 END, c.chunk_index LIMIT 20`;
  });
export const askKnowledgeAssistant = createServerFn({ method: "POST" })
  .validator(knowledgeQuerySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canUseKnowledgeRole(context.role))
      throw new Error("Knowledge assistant is not available for this role");
    assertInputSize(data.query);
    assertPromptSafe(data.query);
    const sql = requireDatabase();
    const sources = await sql<
      { chunk_id: string; source_id: string; title: string; source_type: string; content: string }[]
    >`SELECT c.id AS chunk_id, c.source_id, s.title, s.source_type, c.content FROM hw_ai_knowledge_chunks c JOIN hw_ai_knowledge_sources s ON s.id = c.source_id AND s.school_id = c.school_id WHERE c.school_id = ${context.schoolId} AND c.active = TRUE AND s.active = TRUE AND s.approval_state = 'approved' AND (c.content ILIKE ${`%${data.query}%`} OR s.title ILIKE ${`%${data.query}%`}) ORDER BY CASE WHEN s.title ILIKE ${`%${data.query}%`} THEN 0 ELSE 1 END LIMIT 8`;
    const state = knowledgeAnswerState(
      sources.length,
      Boolean(process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY),
    );
    const queryRows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_knowledge_queries (school_id, requester_id, query, citation_ids, evidence, confidence, status) VALUES (${context.schoolId}, ${context.userId}, ${data.query}, ${sources.map((source) => source.source_id)}, ${JSON.stringify(sources.map((source) => ({ sourceId: source.source_id, title: source.title, excerpt: source.content.slice(0, 600) })))}::JSONB, ${state === "READY" ? "medium" : "unknown"}, ${state === "NO_APPROVED_SOURCE" ? "no_approved_source" : state === "CONFIGURATION_REQUIRED" ? "configuration_required" : "pending"}) RETURNING id`;
    const queryId = queryRows[0]!.id;
    if (state === "NO_APPROVED_SOURCE")
      return {
        status: "no_approved_source" as const,
        message: "No approved school source was found for this question.",
        queryId,
        sources: [],
      };
    if (state === "CONFIGURATION_REQUIRED")
      return {
        status: "configuration_required" as const,
        message: "AI provider configuration is required for source-backed answers.",
        queryId,
        sources,
      };
    const prompt = JSON.stringify({
      question: data.query,
      sources: sources.map((source) => ({
        citation: source.source_id,
        title: source.title,
        content: source.content,
      })),
    });
    await enforceAiUsage(sql, context, "v6_knowledge_assistant", prompt.length);
    const requestId = crypto.randomUUID();
    try {
      const result = await generateText({
        feature: "v6-knowledge-assistant",
        messages: [
          {
            role: "system",
            content:
              "Answer only from the approved school sources supplied by the server. Cite source IDs in square brackets. If the sources do not answer the question, say that no approved source was found. Do not invent policy, facts, or citations.",
          },
          { role: "user", content: prompt },
        ],
        maxOutputTokens: 900,
      });
      await recordAiUsage(sql, context, {
        feature: "v6_knowledge_assistant",
        provider: result.provider,
        model: result.model,
        requestId: result.requestId,
        inputChars: prompt.length,
        outputTokens: result.outputTokens,
        status: "success",
      });
      const provenance = await sql<
        { id: string }[]
      >`INSERT INTO hw_ai_provenance_records (school_id, output_type, output_id, request_id, provider, model, requested_by, source_document_ids, confidence, uncertainty, missing_data, approval_status) VALUES (${context.schoolId}, 'knowledge_answer', ${queryId}, ${result.requestId}, ${result.provider}, ${result.model}, ${context.userId}, '{}', 'medium', '{}'::JSONB, '[]'::JSONB, 'generated') RETURNING id`;
      await sql`UPDATE hw_ai_knowledge_queries SET answer = ${result.data}, status = 'answered', provenance_id = ${provenance[0]!.id} WHERE id = ${queryId} AND school_id = ${context.schoolId}`;
      await recordAiAudit(
        sql,
        context,
        "v6_knowledge_assistant",
        result.requestId,
        `Approved-source answer with ${sources.length} evidence chunks`,
      );
      return {
        status: "answered" as const,
        answer: result.data,
        queryId,
        provenanceId: provenance[0]!.id,
        sources,
      };
    } catch (error) {
      const queryStatus =
        error instanceof AiConfigurationError ? "configuration_required" : "failed";
      const usageStatus =
        error instanceof AiConfigurationError ? "configuration_required" : "failure";
      await recordAiUsage(sql, context, {
        feature: "v6_knowledge_assistant",
        provider: "unavailable",
        model: "unavailable",
        requestId,
        inputChars: prompt.length,
        status: usageStatus,
        errorCode: error instanceof Error ? error.name : "AI_ERROR",
      });
      await sql`UPDATE hw_ai_knowledge_queries SET status = ${queryStatus} WHERE id = ${queryId} AND school_id = ${context.schoolId}`;
      return {
        status: queryStatus as "configuration_required" | "failed",
        message: normalizeAiError(error),
        queryId,
        sources,
      };
    }
  });
function canUseKnowledgeRole(role: AuthContext["role"]) {
  return ["student", "teacher", "parent", "staff", "admin", "principal", "owner"].includes(role);
}

const predictionSchema = z.object({
  predictionType: z.enum([
    "student_performance",
    "attendance",
    "homework_completion",
    "exam_score",
    "dropout_risk",
    "teacher_workload",
    "resource_demand",
    "academic_trends",
    "school_performance",
    "intervention_outcomes",
  ]),
  targetEntityType: z.enum(["student", "teacher", "class", "school", "intervention"]),
  targetEntityId: z.string().min(1).max(160),
  horizon: z.string().trim().max(120).default("current_review_window"),
  observationCount: z.number().int().nonnegative(),
  featureSnapshot: z.record(z.unknown()).default({}),
  stale: z.boolean().default(false),
  missingAttendance: z.boolean().default(false),
  missingAssessments: z.boolean().default(false),
});
export const requestV6Prediction = createServerFn({ method: "POST" })
  .validator(predictionSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canRequestPrediction(context.role))
      throw new Error("Prediction requests require authorized staff or leadership access");
    const sql = requireDatabase();
    const settings = await sql<
      { enable_predictions: boolean }[]
    >`SELECT enable_predictions FROM hw_ai_settings WHERE school_id = ${context.schoolId}`;
    if (settings[0] && !settings[0].enable_predictions)
      throw new Error("Predictive analytics is disabled by school AI settings");
    const status = predictionAvailability(data.observationCount);
    const warnings = warningForDataQuality(data);
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_predictions (school_id, prediction_type, target_entity_type, target_entity_id, confidence, feature_snapshot, horizon, status, created_by) VALUES (${context.schoolId}, ${data.predictionType}, ${data.targetEntityType}, ${data.targetEntityId}, ${status === "insufficient_data" ? "low" : "unknown"}, ${JSON.stringify(data.featureSnapshot)}::JSONB, ${data.horizon}, ${status}, ${context.userId}) RETURNING id`;
    for (const warning of warnings)
      await sql`INSERT INTO hw_ai_warnings (school_id, prediction_id, warning_type, severity, detail) VALUES (${context.schoolId}, ${rows[0]!.id}, ${warning.type}, ${warning.severity}, ${warning.detail})`;
    await audit(
      context,
      "create",
      "ai_prediction",
      rows[0]!.id,
      status === "insufficient_data"
        ? "Prediction unavailable: insufficient historical data"
        : "Prediction request persisted pending a validated model",
    );
    return {
      id: rows[0]!.id,
      status,
      warnings,
      message:
        status === "insufficient_data"
          ? "Prediction unavailable: insufficient historical data."
          : "Prediction request recorded; no validated model is configured.",
    };
  });
export const listV6Predictions = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  return sql`SELECT p.id, p.prediction_type, p.target_entity_type, p.target_entity_id, p.prediction_value, p.confidence, p.prediction_interval, p.provider, p.model, p.horizon, p.status, p.human_review_status, p.actual_outcome, p.created_at, COALESCE(json_agg(w ORDER BY w.created_at) FILTER (WHERE w.id IS NOT NULL), '[]') AS warnings FROM hw_ai_predictions p LEFT JOIN hw_ai_warnings w ON w.prediction_id = p.id AND w.school_id = p.school_id WHERE p.school_id = ${context.schoolId} GROUP BY p.id ORDER BY p.created_at DESC LIMIT 300`;
});
const predictionReviewSchema = z.object({
  predictionId: z.string().uuid(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  note: z.string().trim().max(1600).default(""),
});
export const reviewV6Prediction = createServerFn({ method: "POST" })
  .validator(predictionReviewSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canManageV6Governance(context.role))
      throw new Error("Only leadership can review predictions");
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`UPDATE hw_ai_predictions SET status = ${data.status}, human_review_status = ${data.status}, updated_at = NOW() WHERE id = ${data.predictionId} AND school_id = ${context.schoolId} RETURNING id`;
    if (!rows[0]) throw new Error("Prediction not found");
    await audit(
      context,
      "review",
      "ai_prediction",
      data.predictionId,
      `Prediction review state changed to ${data.status}: ${data.note}`,
    );
    return { id: data.predictionId, status: data.status };
  });
const evaluationSchema = z.object({
  predictionId: z.string().uuid(),
  predicted: z.record(z.unknown()).default({}),
  actual: z.record(z.unknown()).default({}),
  error: z.record(z.unknown()).default({}),
  predictionDate: z.string().datetime(),
});
export const evaluateV6Prediction = createServerFn({ method: "POST" })
  .validator(evaluationSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, GOVERNANCE);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_ai_predictions WHERE id = ${data.predictionId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Prediction not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_prediction_evaluations (school_id, prediction_id, predicted, actual, error, prediction_date, evaluated_by) VALUES (${context.schoolId}, ${data.predictionId}, ${JSON.stringify(data.predicted)}::JSONB, ${JSON.stringify(data.actual)}::JSONB, ${JSON.stringify(data.error)}::JSONB, ${data.predictionDate}, ${context.userId}) RETURNING id`;
    await sql`UPDATE hw_ai_predictions SET status = 'evaluated', actual_outcome = ${JSON.stringify(data.actual)}::JSONB, evaluated_at = NOW() WHERE id = ${data.predictionId} AND school_id = ${context.schoolId}`;
    await audit(
      context,
      "evaluate",
      "ai_prediction",
      data.predictionId,
      "Prediction evaluated against recorded outcome",
    );
    return { id: rows[0]!.id };
  });

export const getV6AiSettings = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requireRole(context, STAFF);
  const sql = requireDatabase();
  const rows =
    await sql`SELECT id, enable_ai_tutor, enable_content_generation, enable_predictions, approved_providers, approved_knowledge_sources, human_review_required, role_permissions, updated_by, updated_at FROM hw_ai_settings WHERE school_id = ${context.schoolId}`;
  return (
    rows[0] ?? {
      school_id: context.schoolId,
      enable_ai_tutor: true,
      enable_content_generation: true,
      enable_predictions: false,
      approved_providers: [],
      approved_knowledge_sources: false,
      human_review_required: true,
      role_permissions: {},
    }
  );
});
const settingsSchema = z.object({
  enableAiTutor: z.boolean(),
  enableContentGeneration: z.boolean(),
  enablePredictions: z.boolean(),
  approvedProviders: z.array(z.string().max(120)).max(20),
  approvedKnowledgeSources: z.boolean(),
  humanReviewRequired: z.boolean(),
  rolePermissions: z.record(z.unknown()).default({}),
});
export const updateV6AiSettings = createServerFn({ method: "POST" })
  .validator(settingsSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canManageV6Governance(context.role))
      throw new Error("Only leadership can update school AI settings");
    const sql = requireDatabase();
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_settings (school_id, enable_ai_tutor, enable_content_generation, enable_predictions, approved_providers, approved_knowledge_sources, human_review_required, role_permissions, updated_by) VALUES (${context.schoolId}, ${data.enableAiTutor}, ${data.enableContentGeneration}, ${data.enablePredictions}, ${data.approvedProviders}, ${data.approvedKnowledgeSources}, ${data.humanReviewRequired}, ${JSON.stringify(data.rolePermissions)}::JSONB, ${context.userId}) ON CONFLICT (school_id) DO UPDATE SET enable_ai_tutor = EXCLUDED.enable_ai_tutor, enable_content_generation = EXCLUDED.enable_content_generation, enable_predictions = EXCLUDED.enable_predictions, approved_providers = EXCLUDED.approved_providers, approved_knowledge_sources = EXCLUDED.approved_knowledge_sources, human_review_required = EXCLUDED.human_review_required, role_permissions = EXCLUDED.role_permissions, updated_by = EXCLUDED.updated_by, updated_at = NOW() RETURNING id`;
    await audit(
      context,
      "update",
      "ai_settings",
      rows[0]!.id,
      "School AI governance settings updated",
    );
    return { id: rows[0]!.id };
  });
export const getV6AiUsageGovernance = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  if (!canManageV6Governance(context.role))
    throw new Error("Only leadership can view AI governance aggregates");
  const sql = requireDatabase();
  const [byRole, byFeature, byStatus, totals] = await Promise.all([
    sql`SELECT role, COUNT(*)::int AS requests FROM hw_ai_usage WHERE school_id = ${context.schoolId} GROUP BY role ORDER BY requests DESC`,
    sql`SELECT feature, COUNT(*)::int AS requests FROM hw_ai_usage WHERE school_id = ${context.schoolId} GROUP BY feature ORDER BY requests DESC`,
    sql`SELECT status, COUNT(*)::int AS requests FROM hw_ai_usage WHERE school_id = ${context.schoolId} GROUP BY status`,
    sql`SELECT COUNT(*)::int AS requests, COALESCE(SUM(input_chars), 0)::int AS input_chars, COALESCE(SUM(output_tokens), 0)::int AS output_tokens FROM hw_ai_usage WHERE school_id = ${context.schoolId}`,
  ]);
  return { byRole, byFeature, byStatus, totals };
});

const journeySchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().trim().min(1).max(120),
  concepts: z.array(z.unknown()).max(100).default([]),
  currentMastery: z.record(z.unknown()).default({}),
  prerequisiteGaps: z.array(z.unknown()).max(50).default([]),
  recommendedNextConcept: z.string().max(180).default(""),
  recommendedPractice: z.array(z.unknown()).max(50).default([]),
  revisionSchedule: z.array(z.unknown()).max(50).default([]),
  progress: z.record(z.unknown()).default({}),
  status: z.enum(["active", "paused", "completed"]).default("active"),
});
export const saveV6LearningJourney = createServerFn({ method: "POST" })
  .validator(journeySchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "staff", "admin", "principal", "owner"]);
    const sql = requireDatabase();
    const valid =
      await sql`SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId}`;
    if (!valid[0]) throw new Error("Student not found");
    const rows = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_learning_journeys (school_id, student_id, subject, concepts, current_mastery, prerequisite_gaps, recommended_next_concept, recommended_practice, revision_schedule, progress, status, updated_by) VALUES (${context.schoolId}, ${data.studentId}, ${data.subject}, ${JSON.stringify(data.concepts)}::JSONB, ${JSON.stringify(data.currentMastery)}::JSONB, ${JSON.stringify(data.prerequisiteGaps)}::JSONB, ${data.recommendedNextConcept}, ${JSON.stringify(data.recommendedPractice)}::JSONB, ${JSON.stringify(data.revisionSchedule)}::JSONB, ${JSON.stringify(data.progress)}::JSONB, ${data.status}, ${context.userId}) ON CONFLICT (school_id, student_id, subject) DO UPDATE SET concepts = EXCLUDED.concepts, current_mastery = EXCLUDED.current_mastery, prerequisite_gaps = EXCLUDED.prerequisite_gaps, recommended_next_concept = EXCLUDED.recommended_next_concept, recommended_practice = EXCLUDED.recommended_practice, revision_schedule = EXCLUDED.revision_schedule, progress = EXCLUDED.progress, status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW() RETURNING id`;
    await audit(
      context,
      "update",
      "learning_journey",
      rows[0]!.id,
      "Learning journey saved from authorized observed/teacher-reviewed data",
    );
    return { id: rows[0]!.id };
  });
export const getV6LearningJourneys = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (context.role === "student")
    return sql`SELECT j.id, j.subject, j.concepts, j.current_mastery, j.prerequisite_gaps, j.recommended_next_concept, j.recommended_practice, j.revision_schedule, j.progress, j.status, j.updated_at FROM hw_ai_learning_journeys j JOIN hw_students s ON s.id = j.student_id AND s.school_id = j.school_id AND s.user_id = ${context.userId} WHERE j.school_id = ${context.schoolId} ORDER BY j.subject`;
  requireRole(context, STAFF);
  return sql`SELECT j.id, j.student_id, s.name AS student_name, j.subject, j.concepts, j.current_mastery, j.prerequisite_gaps, j.recommended_next_concept, j.recommended_practice, j.revision_schedule, j.progress, j.status, j.updated_at FROM hw_ai_learning_journeys j JOIN hw_students s ON s.id = j.student_id AND s.school_id = j.school_id WHERE j.school_id = ${context.schoolId} ORDER BY s.name, j.subject LIMIT 500`;
});

const classroomSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  lesson: z.string().trim().min(1).max(240),
  topic: z.string().trim().min(1).max(240),
  question: z.string().trim().min(3).max(2000),
});
export const askV6ClassroomAssistant = createServerFn({ method: "POST" })
  .validator(classroomSchema)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (!canReviewAiOutput(context.role))
      throw new Error("Classroom assistant requires teacher or leadership access");
    assertInputSize(data.question);
    assertPromptSafe(data.question);
    const sql = requireDatabase();
    const approved = await sql<
      { source_id: string; title: string; content: string }[]
    >`SELECT c.source_id, s.title, c.content FROM hw_ai_knowledge_chunks c JOIN hw_ai_knowledge_sources s ON s.id = c.source_id AND s.school_id = c.school_id WHERE c.school_id = ${context.schoolId} AND s.approval_state = 'approved' AND s.active = TRUE AND c.active = TRUE AND (c.content ILIKE ${`%${data.topic}%`} OR s.title ILIKE ${`%${data.topic}%`}) LIMIT 6`;
    const prompt = JSON.stringify({
      classContext: { subject: data.subject, lesson: data.lesson, topic: data.topic },
      question: data.question,
      approvedSources: approved,
    });
    const requestId = crypto.randomUUID();
    const query = await sql<
      { id: string }[]
    >`INSERT INTO hw_ai_knowledge_queries (school_id, requester_id, query, citation_ids, evidence, status) VALUES (${context.schoolId}, ${context.userId}, ${data.question}, ${approved.map((source) => source.source_id)}, ${JSON.stringify(approved.map((source) => ({ title: source.title, sourceId: source.source_id })))}::JSONB, 'pending') RETURNING id`;
    if (!approved.length)
      return {
        status: "no_approved_source" as const,
        message: "No approved school source was found for this classroom topic.",
        queryId: query[0]!.id,
      };
    try {
      await enforceAiUsage(sql, context, "v6_classroom_assistant", prompt.length);
      const result = await generateText({
        feature: "v6-classroom-assistant",
        messages: [
          {
            role: "system",
            content:
              "Provide teacher-facing classroom assistance using only the supplied approved sources and lesson context. Do not invent policy or student facts. Mark suggestions as suggestions and cite source IDs.",
          },
          { role: "user", content: prompt },
        ],
        maxOutputTokens: 900,
      });
      await recordAiUsage(sql, context, {
        feature: "v6_classroom_assistant",
        provider: result.provider,
        model: result.model,
        requestId: result.requestId,
        inputChars: prompt.length,
        outputTokens: result.outputTokens,
        status: "success",
      });
      await sql`UPDATE hw_ai_knowledge_queries SET answer = ${result.data}, status = 'answered' WHERE id = ${query[0]!.id} AND school_id = ${context.schoolId}`;
      await recordAiAudit(
        sql,
        context,
        "v6_classroom_assistant",
        result.requestId,
        `Classroom assistance generated with ${approved.length} approved source chunks`,
      );
      return {
        status: "answered" as const,
        answer: result.data,
        queryId: query[0]!.id,
        sources: approved,
      };
    } catch (error) {
      await recordAiUsage(sql, context, {
        feature: "v6_classroom_assistant",
        provider: "unavailable",
        model: "unavailable",
        requestId,
        inputChars: prompt.length,
        status: error instanceof AiConfigurationError ? "configuration_required" : "failure",
        errorCode: error instanceof Error ? error.name : "AI_ERROR",
      });
      await sql`UPDATE hw_ai_knowledge_queries SET status = ${error instanceof AiConfigurationError ? "configuration_required" : "failed"} WHERE id = ${query[0]!.id} AND school_id = ${context.schoolId}`;
      return {
        status:
          error instanceof AiConfigurationError
            ? ("configuration_required" as const)
            : ("failed" as const),
        message: normalizeAiError(error),
        queryId: query[0]!.id,
      };
    }
  });
