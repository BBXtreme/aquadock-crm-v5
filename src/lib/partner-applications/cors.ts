const DEFAULT_ALLOWED_ORIGINS = [
  "https://aquadock.eu",
  "https://www.aquadock.eu",
  "http://localhost:3000",
];

function parseAllowedOrigins(): string[] {
  const raw = process.env.PARTNER_APPLICATION_CORS_ORIGINS?.trim();
  if (raw == null || raw === "") {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

export function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin == null || origin === "") {
    return null;
  }
  const allowed = parseAllowedOrigins();
  return allowed.includes(origin) ? origin : null;
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = resolveCorsOrigin(request);
  if (origin == null) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin == null || origin === "") {
    throw new Error("origin_not_allowed");
  }
  if (resolveCorsOrigin(request) == null) {
    throw new Error("origin_not_allowed");
  }
}
