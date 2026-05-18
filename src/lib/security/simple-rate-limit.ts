const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function enforceSimpleRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitBuckets.get(params.key);

  if (existing == null || existing.resetAt <= now) {
    rateLimitBuckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(params.key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getRequestIpAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor != null && forwardedFor !== "") {
    const first = forwardedFor.split(",")[0];
    if (first != null && first.trim() !== "") {
      return first.trim();
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp != null && realIp.trim() !== "") {
    return realIp.trim();
  }
  return "unknown";
}
