import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const developerSessionCookie = "lessonleaf-developer-session";
export const developerSessionSeconds = 8 * 60 * 60;

export function configuredDeveloperSecret(): string | null {
  const secret = process.env.DEVELOPER_SECRET_KEY;
  return secret && Buffer.byteLength(secret, "utf8") >= 32 ? secret : null;
}

export function matchesDeveloperSecret(candidate: string, secret: string): boolean {
  if (typeof candidate !== "string" || candidate.length > 4096) return false;
  const expectedHash = createHash("sha256").update(secret).digest();
  const candidateHash = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(candidateHash, expectedHash) && Buffer.byteLength(candidate, "utf8") === Buffer.byteLength(secret, "utf8");
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`lessonleaf-developer:${payload}`).digest();
}

export function issueDeveloperSession(secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + developerSessionSeconds;
  const payload = `v1.${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function verifyDeveloperSession(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token || token.length > 256) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || !/^\d{10}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{22}$/.test(parts[2]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[3])) return false;
  const expiresAt = Number(parts[1]);
  if (expiresAt <= Math.floor(now / 1000) || expiresAt > Math.floor(now / 1000) + developerSessionSeconds) return false;
  const suppliedSignature = Buffer.from(parts[3], "base64url");
  return suppliedSignature.length === 32 && timingSafeEqual(suppliedSignature, signature(parts.slice(0, 3).join("."), secret));
}
