import { describe, expect, it } from "vitest";
import { decryptTotpSecret, encryptTotpSecret, generateTotpCode, verifyTotpCode } from "@/lib/totp";

describe("TOTP MFA helpers", () => {
  it("matches the RFC 6238 SHA-1 vector at a known timestamp", async () => {
    const code = await generateTotpCode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000);
    expect(code).toBe("287082");
  });

  it("accepts a one-step clock skew but rejects malformed codes", async () => {
    const timestamp = 1_700_000_000_000;
    const code = await generateTotpCode("JBSWY3DPEHPK3P", timestamp - 30_000);
    expect(await verifyTotpCode("JBSWY3DPEHPK3P", code, timestamp)).toBe(true);
    expect(await verifyTotpCode("JBSWY3DPEHPK3P", "not-a-code", timestamp)).toBe(false);
  });

  it("encrypts and decrypts a secret without returning plaintext ciphertext", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const ciphertext = await encryptTotpSecret(secret);
    expect(ciphertext).not.toContain(secret);
    await expect(decryptTotpSecret(ciphertext)).resolves.toBe(secret);
  });
});
