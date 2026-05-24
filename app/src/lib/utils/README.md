# `app/src/lib/utils/`

Generic, cross-cutting helpers. Every reusable pure function that does
not belong to a specific domain (activity, charts, repos) lives here.

## Files

| File                | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `brandFromUrl.ts`   | Heuristic mapping `remoteUrl` → provider brand slug (`github`/`gitlab`/...). |
| `math.utils.ts`     | `clamp`, `clamp01`, `clampUnit` (alias for `clamp01`).                       |
| `theme.utils.ts`    | Theme palette helpers used by `ThemeWrapper` / persistence.                  |
| `timeAgo.utils.ts`  | Human-readable relative time (`"5 min ago"`) from an ISO timestamp.          |
| `window.utils.ts`   | `runWindow(fn)` + `getCurrentWindow()` — Tauri window IPC with safe fallback. |

Each file with a `.utils.ts` suffix has a matching spec in
`tests/<name>.utils.test.ts`.

## Naming convention

- `<topic>.utils.ts` — cross-cutting helper (this folder's rule).
- `<topic>.ts` — domain-specific helper that lives next to its consumers
  (e.g. `lib/charts/palette.ts`, `lib/activityStats.ts`).

The constants directory uses the same `.constants.ts` suffix; see
`app/src/lib/constants/README.md`.

## When to add here vs. domain folders

- **utils**: pure, no domain knowledge, would still make sense if the
  app was about something completely different. Examples: `clamp`,
  `timeAgo`, `brandFromUrl`.
- **`lib/<domain>/`** (e.g. `lib/charts/`, `lib/activityAggregates.ts`):
  helpers that know specifically about charts, activity, repos, etc.
  Keep them next to their consumers.

If a helper is only used by one component, **inline it** until a second
caller appears. Don't promote to `utils/` speculatively.
