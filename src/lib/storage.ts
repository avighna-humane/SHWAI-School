import { createHash, createHmac, randomUUID } from "node:crypto";
import { validateSafeStorageKey } from "./security.ts";

const MAX_DOCUMENT_BYTES = 50_000_000;
const SIGNED_URL_TTL_SECONDS = 600;

export type StorageOperation = "GET" | "PUT" | "DELETE";

export type StorageConfig = {
  provider: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export class StorageConfigurationError extends Error {
  code = "STORAGE_CONFIGURATION_REQUIRED";

  constructor(message = "Private object storage is not configured") {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageProviderError extends Error {
  code = "STORAGE_PROVIDER_ERROR";

  constructor(message = "Private object storage request failed") {
    super(message);
    this.name = "StorageProviderError";
  }
}

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function storageProviderState() {
  const required = [
    "STORAGE_PROVIDER",
    "STORAGE_ENDPOINT",
    "STORAGE_BUCKET",
    "STORAGE_ACCESS_KEY_ID",
    "STORAGE_SECRET_ACCESS_KEY",
  ];
  const ready = required.every(configured);
  return {
    status: ready ? "configured" : "configuration_required",
    provider: process.env.STORAGE_PROVIDER?.trim() || "",
    detail: ready
      ? "Private S3-compatible object storage is configured."
      : "Configure the private storage provider, endpoint, bucket, and server credentials.",
  } as const;
}

export function requireStorage(): StorageConfig {
  const state = storageProviderState();
  if (state.status !== "configured") throw new StorageConfigurationError(state.detail);
  const endpoint = process.env.STORAGE_ENDPOINT!.trim().replace(/\/+$/, "");
  const provider = process.env.STORAGE_PROVIDER!.trim().toLowerCase();
  if (!/^https:\/\//i.test(endpoint) && process.env.NODE_ENV === "production") {
    throw new StorageConfigurationError("Production private storage requires an HTTPS endpoint");
  }
  if (!/^[a-z0-9.-]{3,63}$/.test(process.env.STORAGE_BUCKET!.trim())) {
    throw new StorageConfigurationError("Storage bucket name is invalid");
  }
  if (!provider || provider === "local") {
    throw new StorageConfigurationError(
      "Local filesystem storage is not supported for production documents",
    );
  }
  return {
    provider,
    endpoint,
    bucket: process.env.STORAGE_BUCKET!.trim(),
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    region: process.env.STORAGE_REGION?.trim() || "us-east-1",
  };
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function uriEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalKey(key: string) {
  return key
    .split("/")
    .map((segment) => uriEncode(segment))
    .join("/");
}

function canonicalQuery(parameters: Record<string, string>) {
  return Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${uriEncode(key)}=${uriEncode(value)}`)
    .join("&");
}

function signingKey(secret: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function objectUrl(config: StorageConfig, key: string) {
  const url = new URL(`${config.endpoint}/`);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${uriEncode(config.bucket)}/${canonicalKey(key)}`;
  return url;
}

export function createPrivateObjectKey(schoolId: string, fileName: string) {
  const safeName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const extension = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "bin";
  const key = `${schoolId}/private/${randomUUID()}.${extension}`;
  return validateSafeStorageKey(key);
}

export function presignPrivateObject(input: {
  operation: StorageOperation;
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}) {
  const config = requireStorage();
  const key = validateSafeStorageKey(input.key);
  const expiresIn = Math.max(60, Math.min(input.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS, 900));
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const url = objectUrl(config, key);
  const host = url.host;
  const credential = `${config.accessKeyId}/${dateStamp}/${config.region}/s3/aws4_request`;
  const parameters: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  };
  const query = canonicalQuery(parameters);
  const canonicalRequest = [
    input.operation,
    url.pathname,
    query,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(config.secretAccessKey, dateStamp, config.region),
  )
    .update(stringToSign)
    .digest("hex");
  url.search = `${query}&X-Amz-Signature=${signature}`;
  return {
    url: url.toString(),
    operation: input.operation,
    key,
    expiresInSeconds: expiresIn,
    contentType: input.contentType ?? undefined,
  };
}

export async function putPrivateObject(input: {
  key: string;
  content: string | Uint8Array;
  contentType: string;
}) {
  const bytes =
    typeof input.content === "string" ? Buffer.from(input.content) : Buffer.from(input.content);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES)
    throw new StorageProviderError("Storage object exceeds the 50 MB limit");
  const signed = presignPrivateObject({
    operation: "PUT",
    key: input.key,
    contentType: input.contentType,
  });
  const response = await fetch(signed.url, {
    method: "PUT",
    headers: { "content-type": input.contentType, "content-length": String(bytes.byteLength) },
    body: bytes,
  });
  if (!response.ok)
    throw new StorageProviderError(`Storage provider rejected the upload (${response.status})`);
  return { key: signed.key, sizeBytes: bytes.byteLength, checksumSha256: sha256(bytes) };
}

export async function deletePrivateObject(key: string) {
  const signed = presignPrivateObject({ operation: "DELETE", key });
  const response = await fetch(signed.url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new StorageProviderError(`Storage provider rejected the deletion (${response.status})`);
  }
}

export function maxStorageObjectBytes() {
  return MAX_DOCUMENT_BYTES;
}

export function malwareScannerConfigured() {
  return Boolean(
    process.env.MALWARE_SCANNER_URL?.trim() && process.env.MALWARE_SCANNER_API_KEY?.trim(),
  );
}

export async function scanPrivateObject(input: { key: string; checksumSha256: string }) {
  const endpoint = process.env.MALWARE_SCANNER_URL?.trim();
  const apiKey = process.env.MALWARE_SCANNER_API_KEY?.trim();
  if (!endpoint || !apiKey) return "pending" as const;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ key: input.key, checksumSha256: input.checksumSha256 }),
      signal: controller.signal,
    });
    if (!response.ok) return "failed" as const;
    const payload = (await response.json()) as { status?: string };
    if (payload.status === "clean") return "clean" as const;
    if (payload.status === "quarantined") return "quarantined" as const;
    return "failed" as const;
  } catch {
    return "failed" as const;
  } finally {
    clearTimeout(timeout);
  }
}
