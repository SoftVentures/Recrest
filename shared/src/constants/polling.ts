/** Default polling cadence for remote provider data (5 min). */
export const POLLING_INTERVAL_DEFAULT_MS = 5 * 60 * 1000;

/** Minimum allowed polling interval (30 s) — prevents hammering APIs. */
export const POLLING_INTERVAL_MIN_MS = 30 * 1000;

/** Maximum allowed polling interval (1 h) — keeps data reasonably fresh. */
export const POLLING_INTERVAL_MAX_MS = 60 * 60 * 1000;

/** Timeout for a single provider request. */
export const PROVIDER_REQUEST_TIMEOUT_MS = 15 * 1000;

/**
 * How often the renderer re-scans the configured scan roots for repositories
 * that appeared on disk since boot (10 min).
 *
 * The filesystem watcher cannot cover this: it only subscribes to repos that
 * are already registered, so a freshly cloned or `git init`-ed folder is
 * invisible to it. Before this existed, new repos surfaced only via an explicit
 * rescan in Settings → Developer.
 */
export const REPO_RESCAN_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Floor between two scan-root walks (2 min). A scan walks the whole tree under
 * every root, so the window-focus trigger must not be able to start one on
 * every alt-tab.
 */
export const REPO_RESCAN_MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Floor between two `list_repos` refetches triggered by a `repo://status` event
 * for a repo the renderer doesn't know yet (5 s).
 *
 * The watcher fans out one event per changed repo, so an unknown-repo burst
 * (a fresh clone landing, a scan registering a batch) would otherwise queue one
 * full list call per event.
 */
export const UNKNOWN_REPO_RELOAD_MIN_INTERVAL_MS = 5 * 1000;
