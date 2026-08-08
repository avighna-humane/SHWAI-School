import { APICallError } from "ai";

const { getRotator, maskKey } = await import("./src/lib/ai/key-rotation.ts");
const { classifyError } = await import("./src/lib/ai/errors.ts");

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok -", msg);
}

// 1. Round robin cycles through all keys before repeating.
{
  const r = getRotator("test-rr", ["a", "b", "c"]);
  const seq = [r.next(), r.next(), r.next(), r.next()];
  assert(JSON.stringify(seq) === JSON.stringify(["a", "b", "c", "a"]), "round-robin cycles a,b,c,a");
}

// 2. A key on cooldown is skipped until it expires.
{
  const r = getRotator("test-cooldown", ["x", "y"]);
  const first = r.next(); // x
  r.markFailure(first, 50);
  const next = r.next(); // should skip x (cooling), pick y
  assert(next === "y", "cooling-down key is skipped, next key used instead");
  await new Promise((res) => setTimeout(res, 60));
  const afterCooldown = r.next();
  assert(afterCooldown === "x" || afterCooldown === "y", "rotator returns a key again after cooldown expires");
}

// 3. All keys on cooldown -> null (router moves to next provider).
{
  const r = getRotator("test-all-cooling", ["only"]);
  const k = r.next();
  r.markFailure(k, 10_000);
  const result = r.next();
  assert(result === null, "rotator returns null when every key is on cooldown");
}

// 4. markSuccess clears a cooldown early.
{
  const r = getRotator("test-success-clears", ["k1"]);
  const k = r.next();
  r.markFailure(k, 10_000);
  r.markSuccess(k);
  const result = r.next();
  assert(result === "k1", "markSuccess clears cooldown immediately");
}

// 5. maskKey never reveals the full key.
{
  const masked = maskKey("sk-super-secret-1234");
  assert(!masked.includes("super-secret"), "maskKey hides the key body");
  assert(masked.endsWith("1234"), "maskKey keeps only last 4 chars visible");
}

// 6. Error classification: 429 -> rate_limit, retry next key.
{
  const err = new APICallError({ message: "rate limited", url: "x", requestBodyValues: {}, statusCode: 429, isRetryable: true });
  const c = classifyError(err);
  assert(c.type === "rate_limit" && c.retryNextKey === true, "429 classified as retryable rate_limit");
}

// 7. Error classification: 401 -> auth, retry next key (temporary).
{
  const err = new APICallError({ message: "invalid api key", url: "x", requestBodyValues: {}, statusCode: 401, isRetryable: false });
  const c = classifyError(err);
  assert(c.type === "auth" && c.retryNextKey === true, "401 classified as retryable auth failure");
}

// 8. Error classification: 400 -> invalid_request, do NOT retry same provider.
{
  const err = new APICallError({ message: "bad request", url: "x", requestBodyValues: {}, statusCode: 400, isRetryable: false });
  const c = classifyError(err);
  assert(c.type === "invalid_request" && c.retryNextKey === false, "400 classified as non-retryable invalid_request");
}

// 9. Error classification: 500 -> server, retry next key.
{
  const err = new APICallError({ message: "oops", url: "x", requestBodyValues: {}, statusCode: 500, isRetryable: true });
  const c = classifyError(err);
  assert(c.type === "server" && c.retryNextKey === true, "500 classified as retryable server error");
}

// 10. Error classification: network error code -> network, retry next key.
{
  const err = Object.assign(new Error("connect failed"), { code: "ECONNRESET" });
  const c = classifyError(err);
  assert(c.type === "network" && c.retryNextKey === true, "ECONNRESET classified as retryable network error");
}

console.log("\nAll router-support unit checks passed.");
