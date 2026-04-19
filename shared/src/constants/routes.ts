/**
 * Canonical route paths for the React Router tree in `app/src/App.tsx`.
 * Callsites should never hardcode these literals — use `AppRoute.REPOS` etc.,
 * and use the `routeTo*` helpers for parametric routes so the shape stays
 * enforced at compile time.
 *
 * Named `AppRoute` (not `Route`) to avoid shadowing `Route` from
 * `react-router-dom`, which shows up in `App.tsx`.
 */
export const AppRoute = {
  ROOT: "/",
  DASHBOARD: "/dashboard",
  REPOS: "/repos",
  REPOS_WITH_ID: "/repos/:repoId",
  REPO: "/repo/:repoId",
  CHANGES: "/changes",
  MERGE_REQUESTS: "/merge-requests",
  MERGE_REQUESTS_LEGACY: "/pull-requests",
  BRANCHES: "/branches",
  ACTIVITY: "/activity",
  SETTINGS: "/settings",
} as const;

export type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute];

export function routeToRepo(repoId: string): string {
  return `/repo/${repoId}`;
}
