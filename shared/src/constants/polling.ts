/** Default polling cadence for remote provider data (5 min). */
export const POLLING_INTERVAL_DEFAULT_MS = 5 * 60 * 1000;

/** Minimum allowed polling interval (30 s) — prevents hammering APIs. */
export const POLLING_INTERVAL_MIN_MS = 30 * 1000;

/** Maximum allowed polling interval (1 h) — keeps data reasonably fresh. */
export const POLLING_INTERVAL_MAX_MS = 60 * 60 * 1000;

/** Timeout for a single provider request. */
export const PROVIDER_REQUEST_TIMEOUT_MS = 15 * 1000;
