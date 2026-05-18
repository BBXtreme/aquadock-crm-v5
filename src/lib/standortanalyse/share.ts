import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SHARE_TOKEN_BYTES = 24;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEYLEN = 64;

export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashSharePassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySharePassword(password: string, saltedHash: string): boolean {
  const [salt, hash] = saltedHash.split(":");
  if (salt === undefined || hash === undefined) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, PASSWORD_KEYLEN);
  const storedHash = Buffer.from(hash, "hex");

  if (passwordHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedHash);
}
