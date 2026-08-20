import { constantTimeEqual } from "@/lib/security";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base32Encode(bytes: Uint8Array) {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string) {
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of value.replace(/=+$/, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

async function hmacSha1(secret: Uint8Array, counter: bigint) {
  const message = new Uint8Array(8);
  let value = counter;
  for (let index = 7; index >= 0; index -= 1) {
    message[index] = Number(value & 255n);
    value >>= 8n;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    secret.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
}

export function generateTotpSecret() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

export async function generateTotpCode(secret: string, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 1000 / 30));
  const digest = await hmacSha1(base32Decode(secret), counter);
  const offset = digest[digest.length - 1]! & 15;
  const binary =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function verifyTotpCode(secret: string, code: string, timestamp = Date.now()) {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const currentStep = Math.floor(timestamp / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const candidate = await generateTotpCode(secret, (currentStep + offset) * 30_000);
    if (constantTimeEqual(textEncoder.encode(candidate), textEncoder.encode(normalized)))
      return true;
  }
  return false;
}

function encryptionSecret() {
  const value =
    process.env.MFA_ENCRYPTION_KEY ??
    (process.env.NODE_ENV === "production"
      ? ""
      : (process.env.SESSION_SECRET ?? "shwai-development-mfa-key"));
  if (!value) throw new Error("MFA_ENCRYPTION_KEY is required in production");
  return value;
}

async function encryptionKey() {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(encryptionSecret()));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptTotpSecret(secret: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    textEncoder.encode(secret),
  );
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptTotpSecret(value: string) {
  const [ivValue, encryptedValue] = value.split(".");
  if (!ivValue || !encryptedValue) throw new Error("Invalid encrypted MFA secret");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(ivValue) },
    await encryptionKey(),
    base64UrlToBytes(encryptedValue),
  );
  return new TextDecoder().decode(decrypted);
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    return `${base32Encode(bytes).slice(0, 5)}-${base32Encode(bytes).slice(5, 10)}`;
  });
}
