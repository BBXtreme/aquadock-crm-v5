import { createHmac, timingSafeEqual } from "node:crypto";

/** Time allowed to upload a CV and complete the application form. */
export const CV_UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;

function getSigningSecret(): string {
  const dedicated = process.env.PARTNER_APPLICATION_UPLOAD_SECRET?.trim();
  if (dedicated != null && dedicated !== "") {
    return dedicated;
  }
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRole != null && serviceRole !== "") {
    return serviceRole;
  }
  throw new Error("missing_upload_secret");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createCvUploadToken(
  storagePath: string,
  expiresAtMs = Date.now() + CV_UPLOAD_TOKEN_TTL_MS,
): string {
  const payload = `${storagePath}|${expiresAtMs}`;
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signPayload(payload)}`;
}

export function verifyCvUploadToken(token: string): { storagePath: string } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) {
    return null;
  }

  const payloadB64 = trimmed.slice(0, dot);
  const sigB64 = trimmed.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const pipe = payload.indexOf("|");
  if (pipe <= 0 || pipe === payload.length - 1) {
    return null;
  }

  const storagePath = payload.slice(0, pipe);
  const expiresRaw = payload.slice(pipe + 1);
  const expiresAtMs = Number(expiresRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }

  const expectedSig = signPayload(payload);
  const sigBuf = Buffer.from(sigB64, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  return { storagePath };
}
