import { LRUCache } from "lru-cache";

/** Upper bound on cached entries; least recently used entries are evicted first. */
export const CACHE_MAX_ENTRIES = 500;

// Bounded LRU. TTL is stored per entry and checked on read (no timers), so
// overwriting a key always gets a fresh expiry and a stale timeout can never
// delete a newer value.
const cache = new LRUCache<string, { data: unknown; expiresAt: number }>({
  max: CACHE_MAX_ENTRIES,
});

export function setCache(key: string, data: unknown, ttl = 30) {
  cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
}

export function getCache(key: string) {
  const v = cache.get(key);
  if (!v) return null;
  if (v.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return v.data as any;
}

export function delCache(key: string) {
  cache.delete(key);
}

export function clearCachePrefix(prefix: string) {
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

export function cacheSize() {
  return cache.size;
}
