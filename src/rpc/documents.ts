// SERVER-ONLY. Document Management
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin, FILES_BUCKET } from "./supabase-admin";
import { resolveActor, ForbiddenError, NotFoundError, type ActorRole } from "./auth-context";
import { assertValidFile, uploadToBucket, signedUrlFor } from "./files";
import type { Role } from "@/types";

export interface DocumentData {
  id: string;
  schoolId: string;
  userId: string;
  name: string;
  filePath: string;
  fileSizeKb: number;
  fileType: string;
  visibilityAudience: Role[];
  classId?: string;
  createdAt: string;
}

/** Fetch visible documents for caller's school and role audience */
export const listDocuments = createServerFn({ method: "GET" })
  .validator((data: { role: string; actorId?: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    const { data: rows, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("school_id", actor.schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const docs = (rows ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      userId: row.user_id,
      name: row.name,
      filePath: row.file_path,
      fileSizeKb: Number(row.file_size_kb),
      fileType: row.file_type,
      visibilityAudience: (row.visibility_audience ?? []) as Role[],
      classId: row.class_id || undefined,
      createdAt: row.created_at,
    })) as DocumentData[];

    return docs.filter((doc) => {
      // Principal sees all files
      if (actor.role === "principal") return true;

      // Filter by role visibility audience
      if (
        doc.visibilityAudience.length > 0 &&
        !doc.visibilityAudience.includes(actor.role as ActorRole)
      ) {
        return false;
      }

      // Filter by student class targeting if applicable
      if (actor.role === "student" && doc.classId && doc.classId !== actor.classId) {
        return false;
      }

      return true;
    });
  });

/** Secure file upload handling */
export const uploadDocument = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const role = data.get("role") as string;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role: role as ActorRole, actorId });

    const name = String(data.get("name") ?? "").trim();
    const visibility = JSON.parse(String(data.get("visibilityAudience") ?? "[]")) as Role[];
    const classId = (data.get("classId") as string) || undefined;
    const file = data.get("file");

    if (!file || !(file instanceof File) || file.size === 0) {
      throw new Error("A valid file upload is required.");
    }

    assertValidFile(file);

    // Save actual file to private storage bucket
    const targetFolder = `school-docs/${actor.schoolId}`;
    const fileMeta = await uploadToBucket(targetFolder, file);

    // Save record to DB
    const { data: inserted, error } = await supabaseAdmin
      .from("documents")
      .insert({
        school_id: actor.schoolId,
        user_id: actor.id,
        name: name || file.name,
        file_path: fileMeta.file_path,
        file_size_kb: Math.round((file.size / 1024) * 100) / 100,
        file_type: file.name.split(".").pop()?.toUpperCase() || "PDF",
        visibility_audience: visibility.length > 0 ? visibility : ["student", "teacher", "parent"],
        class_id: classId || null,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      // Cleanup uploaded file on DB insert failure
      await supabaseAdmin.storage.from(FILES_BUCKET).remove([fileMeta.file_path]);
      throw new Error(error?.message ?? "Failed to save document metadata.");
    }

    return { id: inserted.id as string };
  });

/** Generate secure signed URL for secure authenticated document downloading */
export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .validator((data: { role: string; actorId?: string; documentId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .single();

    if (error || !doc) {
      throw new NotFoundError("Document not found.");
    }

    // Security boundary: Validate caller belongs to the document's school
    if (doc.school_id !== actor.schoolId) {
      throw new ForbiddenError("You cannot access this school's documents.");
    }

    // Role visibility boundary
    const audience = (doc.visibility_audience ?? []) as Role[];
    if (
      actor.role !== "principal" &&
      audience.length > 0 &&
      !audience.includes(actor.role as ActorRole)
    ) {
      throw new ForbiddenError("You do not have access permissions to view this document.");
    }

    // Generate authenticated temporary signed link
    const url = await signedUrlFor(doc.file_path);
    return { url };
  });

/** Delete document and file securely */
export const deleteDocument = createServerFn({ method: "POST" })
  .validator((data: { role: string; actorId?: string; documentId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .single();

    if (fetchErr || !doc) {
      throw new NotFoundError("Document not found.");
    }

    if (doc.school_id !== actor.schoolId) {
      throw new ForbiddenError("Cross-tenant access forbidden.");
    }

    if (actor.role !== "principal" && doc.user_id !== actor.id) {
      throw new ForbiddenError("Only the document owner or principal can delete this file.");
    }

    // Delete from DB first
    const { error: dbErr } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", data.documentId);

    if (dbErr) {
      throw new Error(dbErr.message);
    }

    // Delete from storage bucket
    await supabaseAdmin.storage.from(FILES_BUCKET).remove([doc.file_path]);

    return { ok: true };
  });
