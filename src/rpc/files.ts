// SERVER-ONLY. Shared file validation, upload, and signed-URL helpers used by
// notices, homework, submissions, and chat. Files live in a private bucket —
// never a public URL, only short-lived signed URLs issued after an
// authorization check has already passed in the calling module.
//
// Deliberately NOT exported as a createServerFn here: issuing a signed URL for
// an arbitrary file_path with no ownership check would let any caller read any
// file. Each module (notices/homework/submissions/chat) wraps signedUrlFor()
// in its own server function that checks the actor owns/can-see that file
// first — see e.g. getHomeworkAttachmentUrl, getSubmissionFileUrl.
import { FILES_BUCKET, supabaseAdmin } from "./supabase-admin";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export class FileValidationError extends Error {}

export function assertValidFile(file: File): void {
  if (file.size <= 0) throw new FileValidationError("The selected file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new FileValidationError("Files must be 10MB or smaller.");
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new FileValidationError(
      "Unsupported file type. Allowed: PDF, images, Word, Excel, PowerPoint.",
    );
  }
}

export interface StoredFileMeta {
  file_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
}

/** Uploads an already-validated file to the private bucket under the given prefix. */
export async function uploadToBucket(prefix: string, file: File): Promise<StoredFileMeta> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const buffer = await file.arrayBuffer();
  const { error } = await supabaseAdmin.storage.from(FILES_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return {
    file_path: path,
    file_name: file.name,
    size_bytes: file.size,
    mime_type: file.type || "application/octet-stream",
  };
}

/** Issues a short-lived signed URL. Callers must have already authorized the request. */
export async function signedUrlFor(path: string, expiresInSeconds = 60 * 5): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data)
    throw new Error(`Could not create a signed URL: ${error?.message ?? "unknown error"}`);
  return data.signedUrl;
}
