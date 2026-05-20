// Generic in-memory TTL cache used by Phase 1 quick-win caches
// (embedding cache, ranked-ids cache for /companies search + nav-ids).
//
// Intentionally minimal: no external dependencies, Map-backed, capped, with
// periodic pruning on writes and a touched-time based eviction when over cap.
// Phase 1 only — replace with a real store (Redis / Vercel KV) if/when this
// is promoted out of process memory.

type CacheEntry<V> = {
  value: V;
  expiresAt: number;
  touchedAt: number;
};

export type TtlCacheStats = {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  expired: number;
};

export class TtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();
  private writes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expired = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly pruneEveryWrites = 25,
  ) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.expired += 1;
      this.misses += 1;
      return undefined;
    }
    entry.touchedAt = Date.now();
    this.hits += 1;
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + this.ttlMs,
      touchedAt: now,
    });

    this.writes += 1;
    if (this.writes % this.pruneEveryWrites === 0) {
      this.prune();
    }

    if (this.store.size > this.maxEntries) {
      this.evictOldestTouched();
    }
  }

  clear(): void {
    this.store.clear();
  }

  /** Snapshot for diagnostics / perf logs. Does not reset counters. */
  stats(): TtlCacheStats {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expired: this.expired,
    };
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        this.expired += 1;
      }
    }
  }

  private evictOldestTouched(): void {
    let oldestKey: K | undefined;
    let oldestTouched = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.store) {
      if (entry.touchedAt < oldestTouched) {
        oldestTouched = entry.touchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
      this.evictions += 1;
    }
  }
}
