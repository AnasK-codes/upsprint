/** Shared settings for calls to external coding platforms. */
export const HTTP_TIMEOUT_MS = 10_000;

export const USER_AGENT = "Mozilla/5.0 (compatible; UpSprint/1.0; +coding-stats-aggregator)";

/** Axios options used by every platform fetcher. */
export const platformRequestConfig = {
  timeout: HTTP_TIMEOUT_MS,
  headers: { "User-Agent": USER_AGENT },
};
