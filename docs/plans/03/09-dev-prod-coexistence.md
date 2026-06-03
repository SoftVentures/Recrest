# Plan 9 — Dev/Prod Co-existence (retroactive)

This is a **retroactive** sub-plan. The master spec's Phase E.1 ("Dev- und
prod-Instanz parallel betreibbar") was implemented out-of-band before the
03-sub-plan series was structured, and the README's sub-plan index never
captured it. This file exists so the index matches reality.

> **Status:** ✅ Done. No follow-up work expected — this doc is bookkeeping.

---

## Master-spec reference

Master spec section: `docs/plans/03-repo-and-git-actions.md` §"Phase E — Dev/Prod Co-Existence" → E.1.

Intent: a `yarn dev` build and an installed production build must run side-by-side
without colliding on:

- the `tauri-plugin-single-instance` lock key
- `appDataDir` / `appConfigDir` / `appLogDir` paths
- the macOS bundle id and Windows AUMID
- the `recrest://` deep-link scheme
- the OS keychain service used by `auth/token.rs`

The fix is a single source of truth for build-identity strings, plus a Tauri-dev
config overlay that swaps the identifier only in `tauri dev` (and is ignored by
`tauri build`).

---

## What landed

### `app/src-tauri/src/identity.rs`

Exports the constants + helpers the rest of the codebase reads from:

| Symbol | Purpose |
| --- | --- |
| `IDENTIFIER_PROD` / `IDENTIFIER_DEV` | `eu.softventures.recrest` / `…recrest.dev` |
| `DEEP_LINK_SCHEME_PROD` / `…DEV` | `recrest` / `recrest-dev` |
| `TRAY_TOOLTIP_PROD` / `…DEV` | `Recrest` / `Recrest Dev` |
| `current_identifier()` | branch via `cfg!(debug_assertions)` |
| `current_deep_link_scheme()` | same |
| `current_tray_tooltip()` | same |
| `current_oauth_callback_prefix()` | `<scheme>://oauth/callback` |
| `test_profile_root()` | Plan-8 E2E test-profile redirect (separate concern, see Plan 8) |

Tests in the same file (`#[cfg(test)] mod tests`) lock in the dev variants
under `debug_assertions` and pin the prod constants verbatim.

### `app/src-tauri/tauri.dev.conf.json`

Overlay applied only by `tauri dev`. Sets:

- `productName: "Recrest Dev"`
- `identifier: "eu.softventures.recrest.dev"`
- `app.windows[0].title: "Recrest Dev"`
- `plugins.deep-link.desktop.schemes: ["recrest-dev"]`
- icon overlay → `icons-dev/`

`tauri build` ignores this file → release builds keep prod identity.

### `lib.rs` wiring

Every site that used to hard-code identity strings now reads from `identity::`:

- `set_app_user_model_id` (Windows AUMID) → `current_identifier()`
- Tray tooltip → `current_tray_tooltip()`
- Main-window title at runtime → `current_tray_tooltip()` (matches the tray)
- Deep-link OAuth callback matcher → `current_oauth_callback_prefix()`
- Dev session-log key → `current_identifier()`

### `auth/token.rs`

The keychain `SERVICE` constant is gone; `KeyringBackend::new(identity::current_identifier())`
is now constructed at `TokenStore::new()` time. Dev tokens live in a separate
keychain entry from prod tokens, so authenticating in dev doesn't pollute the
installed app and vice-versa.

The dev-build file-backed fallback (`<app_data_dir>/dev-tokens.json`) inherits
isolation automatically because `app_data_dir` itself is identifier-derived.

---

## What Tauri picks up for free once the identifier diverges

These didn't need code changes — they follow the identifier:

- single-instance lock key (Named Mutex on Windows, file-lock on Unix)
- `appDataDir` / `appConfigDir` / `appLogDir`
- every plugin-store path
- the macOS Bundle id at `tauri build` time

---

## Migration

Dev-side state under the old shared `eu.softventures.recrest/` directory is **not**
auto-migrated to the new `eu.softventures.recrest.dev/`. Anyone running `yarn dev`
after the switch sees a one-time fresh state (settings, repo list, tokens). This was
accepted — dev setups are throwaway by convention.

---

## Verification

- `cargo test --manifest-path app/src-tauri/Cargo.toml identity` green (dev/prod
  branching, tray tooltip, OAuth callback string, test-profile env semantics).
- Manual: `yarn dev` while an installed prod build is running →
  - both windows visible simultaneously
  - macOS Keychain shows two entries: `eu.softventures.recrest` + `eu.softventures.recrest.dev`
  - second `yarn dev` invocation focuses the running dev window (single-instance
    works) instead of focusing prod (which would prove the lock-key collision).

---

## Why this is a retroactive doc, not a TDD checklist

The sub-plan files in this directory follow a strict test-first checklist format
because they were authored before the work was done. E.1 went the other way: the
fix was small enough to land directly during an earlier branch's session, and the
tests in `identity.rs` were written alongside the constants. Re-shaping it into a
TDD checklist post-hoc would be cargo-cult — the value here is documenting **what
exists** so the next contributor doesn't trip over the implicit `cfg!(debug_assertions)`
branch in identifier resolution.

If E.1 ever needs follow-up work (a third build variant, a renamed identifier,
adding a per-tenant suffix, etc.), promote this file to a proper TDD plan at
that point.
