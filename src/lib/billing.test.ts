import { afterEach, describe, expect, it } from "vitest";
import { verifyBillingSignature } from "@/lib/billing";

const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
  else process.env.PAYMENT_WEBHOOK_SECRET = previousSecret;
});

describe("billing webhook signatures", () => {
  it("accepts an HMAC-SHA256 hex signature for the raw body", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(process.env.PAYMENT_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
    );
    const signature = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(verifyBillingSignature(body, signature)).resolves.toBe(true);
  });

  it("rejects missing or invalid signatures", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
    await expect(verifyBillingSignature("{}", "")).resolves.toBe(false);
    await expect(verifyBillingSignature("{}", "invalid")).resolves.toBe(false);
  });
});
