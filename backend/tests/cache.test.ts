import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCache, getCache, delCache, clearCachePrefix, cacheSize, CACHE_MAX_ENTRIES } from "../src/utils/cache.js";

beforeEach(() => {

  vi.useFakeTimers();
  clearCachePrefix("");
});
afterEach(() => vi.useRealTimers());

describe("cache", () => {
  it("returns a value until its TTL elapses", () => {
    setCache("k", "v", 10);
    expect(getCache("k")).toBe("v");
    vi.advanceTimersByTime(9_000);
    expect(getCache("k")).toBe("v");
    vi.advanceTimersByTime(2_000);
    expect(getCache("k")).toBeNull();
  });

  it("overwriting a key gets a fresh TTL (old timer must not evict the new value)", () => {
    setCache("k", "old", 10);
    vi.advanceTimersByTime(8_000);
    setCache("k", "new", 10);
    vi.advanceTimersByTime(5_000); // 13s after the first set, 5s after the second
    expect(getCache("k")).toBe("new");
  });

  it("is bounded: oldest entries are evicted past the max size", () => {
    for (let i = 0; i < CACHE_MAX_ENTRIES + 25; i++) setCache(`k${i}`, i, 60);
    expect(cacheSize()).toBeLessThanOrEqual(CACHE_MAX_ENTRIES);
    expect(getCache("k0")).toBeNull();
    expect(getCache(`k${CACHE_MAX_ENTRIES + 24}`)).toBe(CACHE_MAX_ENTRIES + 24);
  });

  it("keeps delCache and clearCachePrefix behaviour", () => {
    setCache("a:1", 1);
    setCache("a:2", 2);
    setCache("b:1", 3);
    delCache("a:1");
    expect(getCache("a:1")).toBeNull();
    clearCachePrefix("a:");
    expect(getCache("a:2")).toBeNull();
    expect(getCache("b:1")).toBe(3);
  });
});
