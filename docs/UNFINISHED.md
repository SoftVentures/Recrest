# Unfinished

Priority order — top is most important. Tick off when the code catches up.

## 🧪 Testing & Stories

Across the ~180 component folders each has an `index.tsx` + `.test.tsx` + `.stories.tsx`, but most tests and stories are stubs today.

- [ ] **E2E schreiben** — expand `tests/src/e2e/` beyond `smoke.spec.ts`. Cover All cases (eg: multi-window, deep-link, tray-icon flows).
- [ ] **Unit tests schreiben** — replace the `it.todo("rendert ohne Crash")` stubs with real rendering / interaction assertions. Start with atoms, then molecules, then organisms. Pure utilities in `lib/` deserve the most aggressive coverage.
- [ ] **Stories schreiben** — replace the default `export const Default = {}` stubs with meaningful prop variants (loading / empty / error / long content / destructive) per component. Use `src/test-utils/fixtures.ts` for realistic data.

## 🔧 Release ops (needs work outside the code)

- [ ] GitHub Actions — repo has no `.github/` folder yet. Needs CI (typecheck + lint + test + e2e) and a release workflow for signed, cross-platform Tauri bundles.
- [ ] Code-signing certificates (Apple Developer ID, Windows EV/OV cert) so the auto-updater signature check works.
- [ ] Populate `app/src-tauri/tauri.conf.json::updater.pubkey` (blocks auto-updater end-to-end even with the cert).
- [ ] Set `SENTRY_DSN` at `tauri build` time so crash reporting actually ships when the user opts in.
- [ ] Landing page + download page (GitHub Pages) with platform-detecting installer links.
- [ ] Auto-deploy installers + release notes when a tag is pushed.
