# CLAUDE.md — @recrest/shared

This file provides guidance to Claude Code when working inside the `shared/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

`@recrest/shared` holds constants, TypeScript types, and pure utility functions that both the app frontend and the E2E tests consume. It is intentionally framework-free — no React, no Tauri, no DOM. If a symbol needs those, it does not belong here.

## Commands

All commands run from the repo root via `yarn workspace @recrest/shared <script>`:

- `build` — `tsc -b`. Emits to `dist/`; this is what `@recrest/app` imports at runtime.
- `build:watch` — incremental build during development.
- `clean` — wipes `dist/`.
- `test` — vitest in `node` environment.
- `test:ts` — `tsc --noEmit` for fast typecheck.
- `lint`, `format`, `format:check` — standard.

The root `postinstall` and `predev` hooks already run `build`, so after `yarn install` the `dist/` is fresh. If you edit shared code while `yarn dev:web` is running, rebuild shared manually (`yarn workspace @recrest/shared build`) or run `build:watch` in a second terminal — Vite picks up the rebuilt JS on save.

## Module layout

- `src/index.ts` — barrel export. **Every public symbol must be re-exported here**, otherwise consumers can't reach it without reaching into internal paths.
- `src/constants/` — app, git, providers, polling, ide, ui. Magic values live here, not in components.
- `src/types/` — repo, provider, pr, settings, ide. These types must mirror Rust DTOs (serde `rename_all = "camelCase"`) on the Tauri side.
- `src/utils/` — pure functions only (formatting, URL matching). Each util has a `*.test.ts` sibling.

## Conventions

- `tsconfig.json` sets `composite: true` + `declaration: true`. Do not add `noEmit: true` — downstream project references require emit.
- `"type": "module"` with NodeNext resolution. **Relative imports must end in `.js`** even when the file is `.ts` (e.g. `export * from "./types/repo.js";`). This is how the emitted output resolves; TypeScript is fine with it at source time.
- When you add a Rust DTO on the app side, add/update the matching TS type here **in the same change** so the cross-language contract stays typed on both ends.
- No side-effect code at module top level — constants and type declarations only.

## Testing

Vitest runs in node environment. `src/utils/formatting.test.ts` and `src/utils/matching.test.ts` are the reference patterns — keep coverage for any new util.
