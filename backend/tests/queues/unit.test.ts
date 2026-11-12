import { describe, expect, it, vi } from "vitest";
import { computeBackoff } from "../../src/queues/backoff.js";
import { CircuitBreaker } from "../../src/queues/circuitBreaker.js";
import { isPermanentError } from "../../src/queues/errors.js";

describe("computeBackoff", () => {
  it("grows exponentially and stays within [exp/2, exp]", () => {
    const lo = (n: number) => computeBackoff(n, 1000, 60_000, () => 0);
    const hi = (n: number) => computeBackoff(n, 1000, 60_000, () => 0.999999);
    expect(lo(1)).toBe(500);
    expect(hi(1)).toBeLessThanOrEqual(1000);
    expect(lo(2)).toBe(1000);
    expect(lo(3)).toBe(2000);
    expect(hi(3)).toBeLessThanOrEqual(4000);
  });

  it("is capped", () => {
    expect(computeBackoff(30, 1000, 60_000, () => 0.999999)).toBeLessThanOrEqual(60_000);
    expect(computeBackoff(30, 1000, 60_000, () => 0)).toBe(30_000);
  });

  it("jitters: different random draws give different delays", () => {
    expect(computeBackoff(4, 1000, 60_000, () => 0.1)).not.toBe(computeBackoff(4, 1000, 60_000, () => 0.9));
  });
});

describe("isPermanentError", () => {
  it("treats 4xx as permanent except 408/429", () => {
    expect(isPermanentError({ response: { status: 400 } })).toBe(true);
    expect(isPermanentError({ response: { status: 404 } })).toBe(true);
    expect(isPermanentError({ response: { status: 429 } })).toBe(false);
    expect(isPermanentError({ response: { status: 408 } })).toBe(false);
  });
  it("treats 5xx and network errors as transient", () => {
    expect(isPermanentError({ response: { status: 503 } })).toBe(false);
    expect(isPermanentError(new Error("timeout of 10000ms exceeded"))).toBe(false);
    expect(isPermanentError(new Error("getaddrinfo ENOTFOUND leetcode.com"))).toBe(false);
  });
  it("treats unknown-user messages as permanent", () => {
    expect(isPermanentError(new Error("User not found"))).toBe(true);
    expect(isPermanentError(new Error("That user does not exist."))).toBe(true);
  });
});

describe("CircuitBreaker", () => {
  const opts = { windowSize: 10, minSamples: 4, failureThreshold: 0.5, cooldownMs: 1000 };

  it("stays closed below minSamples, then opens once failures reach the threshold", () => {
    const onOpen = vi.fn();
    const b = new CircuitBreaker(opts, onOpen, vi.fn());
    b.record(false);
    b.record(false);
    b.record(false);
    expect(onOpen).not.toHaveBeenCalled(); // only 3 samples
    b.record(false);
    expect(onOpen).toHaveBeenCalledWith(1000);
    expect(b.isOpen).toBe(true);
    b.dispose();
  });

  it("does not open for a healthy mix", () => {
    const onOpen = vi.fn();
    const b = new CircuitBreaker(opts, onOpen, vi.fn());
    [true, true, true, false, true, true, false, true].forEach((ok) => b.record(ok));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("closes after the cooldown and starts from a fresh window", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const b = new CircuitBreaker(opts, onOpen, onClose);
    [false, false, false, false].forEach((ok) => b.record(ok));
    expect(b.isOpen).toBe(true);
    b.record(false); // ignored while open
    vi.advanceTimersByTime(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(b.isOpen).toBe(false);
    b.record(false); // fresh window: 1 sample, below minSamples
    expect(onOpen).toHaveBeenCalledTimes(1);
    b.dispose();
    vi.useRealTimers();
  });
});
