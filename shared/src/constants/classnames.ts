/**
 * Canonical CSS class-name prefixes used across the app's styles. Each prefix
 * groups the classes that belong to a single view or primitive in
 * `app/src/styles/*.css`.
 *
 * These values are string-identical to the class names in the stylesheet —
 * they're exposed as constants primarily to document the scheme in one place.
 * JSX callsites keep using string literals for readability; if you want
 * compile-time safety on a specific component, import the matching constant
 * here and template-literal the suffix.
 */
export const ClassPrefix = {
  /** Application shell (layout scaffolding). */
  APP: "a-",
  /** Branches page. */
  BRANCH: "a-br-",
  /** Activity page. */
  ACTIVITY: "a-act-",
  /** Dashboard page. */
  DASHBOARD: "a-dash-",
  /** Merge Requests page. */
  MERGE_REQUEST: "a-mr-",
  /** Repositories list / rows. */
  REPO: "a-repo-",
  /** Settings page + forms. */
  SETTINGS: "a-set-",
  /** Provider-auth rows inside Settings > Accounts. */
  PROVIDER: "a-prov-",
  /** Search overlay. */
  SEARCH: "a-search-",
  /** Shortcut-list rendering inside Settings > Shortcuts. */
  SHORTCUT: "a-sc-",
  /** Source (scan-path) rows inside Settings > Integrations. */
  SOURCE: "a-src-",
  /** Reusable Recrest primitives shared across views (`r-btn`, `r-kbd`, …). */
  PRIMITIVE: "r-",
} as const;

export type ClassPrefixName = (typeof ClassPrefix)[keyof typeof ClassPrefix];
