// simple in-memory cache with TTL
const cache = new Map<string, { ts: number; data: any }>();

export function setCache(key: string, data: any, ttl = 30) {
  cache.set(key, { ts: Date.now(), data });
  setTimeout(() => cache.delete(key), ttl * 1000);
}

export function getCache(key: string) {
  const v = cache.get(key);
  if (!v) return null;
  return v.data;
}

export function delCache(key: string) {
  cache.delete(key);
}

export function clearCachePrefix(prefix: string) {
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}
