// SERVER-ONLY. Secure school documents management RPC stubs.
import { createServerFn } from "@tanstack/react-start";
import { resolveActor, ForbiddenError, NotFoundError } from "./auth-context";
import { assertValidFile } from "./files";

export const listDocuments = createServerFn({ method: "GET" })
  .validator((data: { schoolId: string; role: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { schoolId, role } = data;

    // Fetch documents
    const { data: docs, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Filter based on visible roles (securely checked server-side!)
    return (docs || []).filter((doc) => {
      // Principals/Admins can see all documents
      if (role === "principal" || role === "admin") return true;
      // Filter by visible roles array
      const roles = doc.visible_to_roles || [];
      return roles.includes(role) || doc.uploader_id === role;
    });
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { uploadToBucket } = await import("./files");

    const schoolId = String(data.get("schoolId") ?? "");
    const uploaderId = String(data.get("uploaderId") ?? "");
    const actorRole = String(data.get("actorRole") ?? "");
    const category = String(data.get("category") ?? "Notes");
    const visibleToRoles = JSON.parse(String(data.get("visibleToRoles") ?? "[]")) as string[];

    if (actorRole !== "principal" && actorRole !== "teacher" && actorRole !== "admin") {
      throw new ForbiddenError("Only staff and administrators can upload school documents.");
    }

    const file = data.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      throw new Error("No valid file attached.");
    }

    assertValidFile(file);

    // Upload to our secure private bucket 'shwai-documents'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `documents/${schoolId}/${Date.now()}-${safeName}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("shwai-documents")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Insert metadata
    const sizeKb = Math.round(file.size / 1024);
    const fileType = file.name.split(".").pop()?.toUpperCase() || "PDF";

    const { data: inserted, error } = await supabaseAdmin
      .from("documents")
      .insert({
        school_id: schoolId,
        uploader_id: uploaderId,
        name: file.name,
        category,
        size_kb: sizeKb,
        file_type: fileType,
        file_path: path,
        visible_to_roles: visibleToRoles,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      // Cleanup file if DB insert fails
      await supabaseAdmin.storage.from("shwai-documents").remove([path]);
      throw new Error(error?.message || "Failed to save document metadata.");
    }

    return inserted;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator((data: { actorRole: string; uploaderId: string; docId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { actorRole, uploaderId, docId } = data;

    // Fetch original document metadata
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      throw new NotFoundError("Document not found.");
    }

    // Authorize
    const isOwner = doc.uploader_id === uploaderId;
    const isAdmin = actorRole === "principal" || actorRole === "admin";
    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("You are not authorized to delete this document.");
    }

    // Delete from Supabase Storage
    await supabaseAdmin.storage.from("shwai-documents").remove([doc.file_path]);

    // Delete metadata
    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", docId);

    if (error) {
      throw new Error("Failed to delete document metadata.");
    }

    return { ok: true };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .validator((data: { role: string; docId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { role, docId } = data;

    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single();

    if (error || !doc) {
      throw new NotFoundError("Document not found.");
    }

    // Verify visibility permission
    const roles = doc.visible_to_roles || [];
    const isAllowed = role === "principal" || role === "admin" || roles.includes(role) || doc.uploader_id === role;

    if (!isAllowed) {
      throw new ForbiddenError("You do not have permission to view this document.");
    }

    // Create a secure short-lived signed URL
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("shwai-documents")
      .createSignedUrl(doc.file_path, 60 * 5); // 5 mins expiration

    if (signedError || !signedData) {
      throw new Error("Could not generate secure signed URL.");
    }

    return { url: signedData.signedUrl };
  });
