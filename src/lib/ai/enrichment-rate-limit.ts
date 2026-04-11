// In-process daily enrichment usage counter (per Node instance). Serverless: best-effort only.

type DayBucket = { dayKey: string; used: number };

const usageByUser = new Map<string, DayBucket>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureBucket(userId: string): DayBucket {
  const dayKey = utcDayKey();
  const existing = usageByUser.get(userId);
  if (!existing || existing.dayKey !== dayKey) {
    const next: DayBucket = { dayKey, used: 0 };
    usageByUser.set(userId, next);
    return next;
  }
  return existing;
}

export function enrichmentUsageRemaining(userId: string, dailyLimit: number): number {
  if (dailyLimit <= 0) return 0;
  const bucket = ensureBucket(userId);
  return Math.max(0, dailyLimit - bucket.used);
}

export function canReserveEnrichmentSlots(userId: string, slots: number, dailyLimit: number): boolean {
  if (slots <= 0) return true;
  if (dailyLimit <= 0) return false;
  const bucket = ensureBucket(userId);
  return bucket.used + slots <= dailyLimit;
}

export function commitEnrichmentSlots(userId: string, slots: number): void {
  if (slots <= 0) return;
  const bucket = ensureBucket(userId);
  bucket.used += slots;
}

/** Atomically reserves slots if the daily cap allows it (avoids parallel over-commit on one instance). */
export function tryCommitEnrichmentSlots(userId: string, slots: number, dailyLimit: number): boolean {
  if (slots <= 0) return true;
  if (dailyLimit <= 0) return false;
  const bucket = ensureBucket(userId);
  if (bucket.used + slots > dailyLimit) return false;
  bucket.used += slots;
  return true;
}

export function refundEnrichmentSlots(userId: string, slots: number): void {
  if (slots <= 0) return;
  const bucket = ensureBucket(userId);
  bucket.used = Math.max(0, bucket.used - slots);
}
