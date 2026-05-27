# `app/src/lib/constants/`

Frontend-side constants and lookup tables. Every magic string that's loaded
through React, Redux, Vite or Tauri IPC should resolve to a value defined
here (or in `@recrest/shared` and re-exported from here).

## Layering

- **`@recrest/shared/constants/*`** is the source of truth for domain
  strings the Rust backend also knows: IPC channels, command names, storage
  keys, provider IDs, IDE IDs, PR/CI state vocabularies, sort keys, status
  chips. Anything Rust would need to mirror lives there.
- **`app/src/lib/constants/*.constants.ts`** wraps shared values with
  UI-only metadata (icons, tones, label-i18n keys) and owns Frontend-only
  registries that have no Rust counterpart (`testIds.constants.ts`,
  `theme.constants.ts`).

The `index.ts` barrel re-exports every named symbol — most consumers can
write `import { TEST_IDS, StorageKey, Provider } from "@/lib/constants"`
and let the bundler pick the right file.

## File map

| File                       | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `ciStates.constants.ts`    | `CI_STATES` + `CI_STATE_UI` + `ciFor()` helper                           |
| `events.constants.ts`      | Re-exports `EventChannel` / `WindowEvent` from shared                    |
| `ides.constants.ts`        | Re-exports `IDE_DEFINITIONS` + `IDE_UI` logo/filter map                  |
| `prStates.constants.ts`    | `PR_STATES` + `PR_STATE_UI` tone/label map                               |
| `providers.constants.ts`   | Re-exports `PROVIDER_IDS` + `Provider.{GITHUB,GITLAB,BITBUCKET}` + icons |
| `sortKeys.constants.ts`    | `REPO_SORT_KEYS` + `REPO_SORT_UI` label-key map                          |
| `statusChips.constants.ts` | `REPO_STATUS_CHIPS` + `REPO_STATUS_CHIP_UI` icon/tone map                |
| `storage.constants.ts`     | Re-exports `StorageKey`, prefixes, and `storageKeyForX()` generators     |
| `testIds.constants.ts`     | Nested `TEST_IDS` registry + nav helper functions                        |
| `theme.constants.ts`       | Theme tokens, primary-color schemes, theme palette definitions           |
| `tests/`                   | Vitest specs for every constants file                                    |

## Pattern

Static values, nested by domain:

```ts
export const TEST_IDS = {
  app: "app",
  settings: {
    view: "settings-view",
    tab: <T extends string>(id: T) => `settings-tab-${id}` as const,
  },
} as const;
```

Lookup tables use `satisfies` for an exhaustiveness check against the
underlying domain enum:

```ts
export const CI_STATE_UI = {
  success: { tone: "passing", labelKey: "ci.success" },
  failure: { tone: "failing", labelKey: "ci.failure" },
  running: { tone: "running", labelKey: "ci.running" },
  pending: { tone: "running", labelKey: "ci.pending" },
  none: { tone: "idle", labelKey: "ci.none" },
} as const satisfies Record<CiStatus, CiStateUi>;
```

Adding a new `CiStatus` value to `shared/src/types/pr.ts` without
extending `CI_STATE_UI` becomes a compile error.

## ESLint enforcement

`app/eslint.config.js` ships a `no-restricted-syntax` block that forbids
inline magic strings in the most common back-doors:

- `data-testid="…"` and `data-testid={`…-${x}`}` literals must come from
  `TEST_IDS` instead.
- Any string starting with `recrest:` must use a key from `StorageKey` or
  a generator like `storageKeyForLogo`.
- `invoke("…")` / `safeInvoke("…")` / `listen("…")` with a raw string
  argument must reference `TauriCommand` or `EventChannel`.
- IPC scheme literals like `"repo://status"` or `"updater://progress"`
  must use the corresponding `EventChannel` constant.

The constants files in this directory are exempted via an `overrides`
block so they can own the literal values.

If you need to violate one of these (the anti-flash inline `<script>` in
`app/index.html` is the canonical exception — it loads before any module),
add a targeted `// eslint-disable-next-line no-restricted-syntax` and
explain _why_ in a comment.

## Adding a new constant

1. Decide whether the value is domain-level (also needed by Rust) or
   UI-only. Domain values go into `shared/src/constants/`; UI values go
   here.
2. Re-export the symbol from the app-layer file (`storage.constants.ts`,
   `providers.constants.ts`, etc.) so consumers have a single import path.
3. Add a unit test under `tests/` that asserts the new value is reachable
   and conforms to whatever invariant matters (kebab-case format,
   exhaustive coverage of a domain enum, `recrest:` prefix, …).
4. Update the barrel `index.ts` if you added a brand-new file.

## Anti-flash inline script

`app/index.html` contains a `<script>` that runs before any module loads
and references the literal strings `"recrest:theme"` and
`"recrest:theme-follows-system"` to decide which background colour to
paint on the very first frame. **Those literals are intentionally
duplicated there** — see the `THEME / THEME_FOLLOWS_SYSTEM` comment in
`storage.constants.ts` and the test in `tests/storage.constants.test.ts`
that pins the contract. If you rename either key, update the inline
script too.
