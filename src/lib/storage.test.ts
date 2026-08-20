import { afterEach, describe, expect, it } from "vitest";
import { createPrivateObjectKey, presignPrivateObject, storageProviderState } from "./storage";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("private storage boundary", () => {
  it("reports configuration required when provider credentials are absent", () => {
    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_ENDPOINT;
    delete process.env.STORAGE_BUCKET;
    delete process.env.STORAGE_ACCESS_KEY_ID;
    delete process.env.STORAGE_SECRET_ACCESS_KEY;
    expect(storageProviderState().status).toBe("configuration_required");
  });

  it("creates a safe tenant-prefixed object key", () => {
    const key = createPrivateObjectKey("school-a", "../student report.pdf");
    expect(key).toMatch(/^school-a\/private\/[a-f0-9-]+\.pdf$/);
    expect(key).not.toContain("..");
  });

  it("generates a short-lived signed URL without exposing the secret key", () => {
    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_ENDPOINT = "https://objects.example.test";
    process.env.STORAGE_BUCKET = "shwai-private";
    process.env.STORAGE_ACCESS_KEY_ID = "access-key";
    process.env.STORAGE_SECRET_ACCESS_KEY = "secret-key";
    process.env.STORAGE_REGION = "ap-south-1";
    const signed = presignPrivateObject({ operation: "GET", key: "school-a/private/file.pdf" });
    expect(signed.url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(signed.url).toContain("X-Amz-Expires=600");
    expect(signed.url).not.toContain("secret-key");
    expect(signed.key).toBe("school-a/private/file.pdf");
  });
});
