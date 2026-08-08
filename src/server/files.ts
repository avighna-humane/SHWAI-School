/**
 * SERVER-ONLY shared attachment handling: validation, upload, signed URLs.
 * Used by notices, homework, submissions and chat. All uploads land in the
 * single private `shwai-files` bucket, path-prefixed by feature.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin, SHWAI_BUCKET } from "./supabase-admin";
import { resolveActor } from "./auth-context";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface UploadedFileMeta {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

/** Validates + uploads a single base64-encoded file. Throws on rejection. */
export async function uploadAttachment(opts: {
  prefix: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
}): Promise<UploadedFileMeta> {
  if (!ALLOWED_MIME_TYPES.has(opts.mimeType)) {
    throw new Error(`File type "${opts.mimeType}" is not allowed. Use PDF, image, or common document formats.`);
  }

  const buffer = Buffer.from(opts.base64Data, "base64");
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 10MB limit.");
  }
  if (buffer.byteLength === 0) {
    throw new Error("File is empty.");
  }

  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
  const filePath = `${opts.prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error } = await supabaseAdmin().storage.from(SHWAI_BUCKET).upload(filePath, buffer, {
    contentType: opts.mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { filePath, fileName: opts.fileName, sizeBytes: buffer.byteLength, mimeType: opts.mimeType };
}

/** Issues a short-lived signed URL. Caller MUST have already authorized the request. */
export async function signedUrlFor(filePath: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabaseAdmin().storage.from(SHWAI_BUCKET).createSignedUrl(filePath, expiresInSeconds);
  if (error || !data) throw new Error(`Could not create a signed URL: ${error?.message ?? "unknown error"}`);
  return data.signedUrl;
}

const getSignedUrlSchema = z.object({
  role: z.string(),
  actorId: z.string(),
  filePath: z.string(),
  /** Which table the caller believes owns this path — used only for a light sanity check. */
  scope: z.enum(["notices", "homework", "submissions", "chat"]),
});

/**
 * Generic signed-URL fetcher for already-authorized contexts, e.g. a
 * homework detail page the student/teacher was already allowed to open.
 * Re-derives authorization from the path prefix, matching the `scope` the
 * caller is rendering — this is a defense-in-depth check, not the primary
 * authorization (each module's own server function does the real check
 * before ever returning a file_path to the client).
 */
export const getSignedDownloadUrl = createServerFn({ method: "POST" })
  .validator(getSignedUrlSchema)
  .handler(async ({ data }) => {
    resolveActor({ role: data.role, actorId: data.actorId });
    if (!data.filePath.startsWith(`${data.scope}/`)) {
      throw new Error("File path does not match the requested scope.");
    }
    const url = await signedUrlFor(data.filePath);
    return { url };
  });
