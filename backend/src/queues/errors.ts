/**
 * Splits failures into those worth retrying (platform down, timeout, 429, 5xx,
 * network) and permanent ones (unknown user, other 4xx). Permanent failures skip
 * retries and do not count against the platform's circuit breaker.
 */
export function isPermanentError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; message?: string } | undefined;
  const status = e?.response?.status;
  if (status !== undefined) {
    if (status === 408 || status === 429) return false;
    return status >= 400 && status < 500;
  }
  return /not found|does not exist/i.test(e?.message ?? "");
}
