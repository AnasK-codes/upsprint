/**
 * Exponential backoff with "equal jitter": half the exponential delay is fixed,
 * the other half random. Spreads retries without ever retrying instantly.
 * attemptsMade starts at 1 for the first retry.
 */
export function computeBackoff(
  attemptsMade: number,
  baseMs: number,
  maxMs: number,
  random: () => number = Math.random
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attemptsMade - 1));
  return Math.floor(exp / 2 + random() * (exp / 2));
}

export const BACKOFF_TYPE = "expo-jitter";
