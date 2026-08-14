import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  redactSecurityDetail,
  safeErrorMessage,
  validateAttachment,
  validateSafeStorageKey,
} from "./security";

describe("security primitives", () => {
  it("compares equal and unequal byte arrays without accepting length mismatches", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("rejects traversal and malformed storage keys", () => {
    expect(validateSafeStorageKey("school-a/documents/policy.pdf")).toBe(
      "school-a/documents/policy.pdf",
    );
    expect(() => validateSafeStorageKey("../secrets.txt")).toThrow("Storage key is invalid");
    expect(() => validateSafeStorageKey("/absolute/file.pdf")).toThrow("Storage key is invalid");
    expect(() => validateSafeStorageKey("school-a/no-extension")).toThrow("Storage key is invalid");
  });

  it("requires attachment metadata and base64 size consistency", () => {
    const valid = validateAttachment({
      fileName: "answer.txt",
      fileType: "text/plain",
      fileSize: 3,
      fileData: "YWJj",
    });
    expect(valid.fileName).toBe("answer.txt");
    expect(() => validateAttachment({ ...valid, fileName: "../answer.txt" })).toThrow(
      "Attachment filename is invalid",
    );
    expect(() => validateAttachment({ ...valid, fileType: "application/x-sh" })).toThrow(
      "Attachment type is not allowed",
    );
    expect(() => validateAttachment({ ...valid, fileSize: 4 })).toThrow(
      "Attachment size does not match its data",
    );
  });

  it("redacts security detail keys and unknown error messages", () => {
    expect(
      redactSecurityDetail({ token: "secret", emailHash: "safe", fileData: "payload" }),
    ).toEqual({
      emailHash: "safe",
    });
    expect(safeErrorMessage(new Error("postgres://user:password@host/db"))).toBe(
      "Request failed. Please retry.",
    );
    const providerError = Object.assign(new Error("upstream body with a secret"), {
      code: "AI_PROVIDER_HTTP_500",
    });
    expect(safeErrorMessage(providerError)).toBe("Request failed. Please retry.");
  });
});
