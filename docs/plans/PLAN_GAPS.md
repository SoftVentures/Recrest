# Plan 2 — Offene Lücken gegenüber 02-steps/ + 02-material-ui-migration.md

**Stand:** 2026-05-23
**Branch:** `feature/phase-two-mui-migration`
**Methode:** Abgleich der Phase-Pläne (01..05 + Hauptplan) gegen den aktuellen Stand der Codebase (`app/src/`). `src-old/` ist bereits gelöscht (Phase 5 Step 5.2 erledigt), aber zahlreiche Phase-3/4/5-Gates sind nicht erfüllt.

Schwere: **P0** = Plan-Gate hart gerissen (Build/Funktion/Konstanten-Disziplin) · **P1** = Plan fordert es explizit, Code fehlt · **P2** = Convenience/Polish, im Plan optional.

---

## A. Phase 1 — Theme-Foundation

| # | Plan-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| A1 | 1.7 / 1.8 | `Theme.palette.stories.tsx` mit Token-Swatches pro Theme | Datei existiert nicht; in `app/src/theme/` nur `index.ts`, `mui.d.ts`, `index.test.ts`, `overrides/`, `ThemeWrapper.tsx` | **P1** |
| A2 | 1.7 | Accent-Picker (Primary-Color-Scheme) als Toggle in Settings | `primaryColor` ist im Reducer (`settingsReducer.ts:115`), aber kein UI-Element zum Wechseln gefunden | **P1** |
| A3 | 1.8 | Storybook Theme-Toolbar zeigt 4 Themes (`light/dark/oled/glassy`) | `.storybook/preview.tsx` existiert — Inhalt nicht verifiziert, aber **0 Stories** im ganzen Repo (siehe C7) macht Decorator-Wirkung null | **P1** |
| A4 | 1.6 | Tauri-Vibrancy-Plugin für `glassy`-Theme | `Cargo.toml` und `lib.rs` müssten `tauri-plugin-window-vibrancy` enthalten — nicht verifiziert in dieser Analyse, Hinweis dass Phase 1 Gate als grün galt | **P2** |
| A5 | 15.11 (Gap-Analysis) | Theme-Persistence stabil über Reload | Tail-of-conversation belegt Fix via `resolveBootTheme()` + Anti-Flash-Script ist drin; sollte als verifiziert gelten | ✅ |

## B. Phase 2 — Folder-Cut

| # | Plan-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| B1 | 2.2 / 2.10 | `src-old/` als Read-Only-Referenz bis Phase 5 | `src-old/` ist bereits **gelöscht** — `ls app/src-old/` schlägt fehl. Das ist Phase-5-Schritt 5.2, **vorzeitig** durchgeführt | **P2** (Plan-Reihenfolge verletzt, aber Outcome ist OK wenn alle Features wirklich portiert sind — siehe Phase 4 Gaps) |

## C. Phase 3 — Shell + Design System

| # | Plan-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| C1 | 3.1 / 3.8.G | `app/src/lib/constants/events.ts` mit `TauriEvent` als `as const`-Map | Datei existiert (`events.ts`), Inhalt nicht stichprobenartig verifiziert. **Aber** `rg "repo://"` Treffer nur in Kommentaren — vermutlich OK | ✅ |
| C2 | 3.8 / 5.5.3 | `testIds.constants.ts` zentralisiert alle `data-testid`-Strings | Datei vorhanden, alle ~170 statischen + 7 dynamischen Stellen migriert; Playwright-Specs nutzen Helper-Re-Export | ✅ (Plan 3 / PLAN_MAGIC_STRINGS) |
| C3 | 3.8 / 5.5.3 | `storage.constants.ts` für LocalStorage-Keys | Datei vorhanden, alle `recrest:*` Literale auf `StorageKey` / `storageKeyForX()` umgestellt (außer der dokumentierten Anti-Flash-Skript-Ausnahme) | ✅ (Plan 3) |
| C4 | 3.8 / 4.X.8 | `providers.constants.ts`, `prStates.constants.ts`, `ciStates.constants.ts` | Alle drei vorhanden, plus `ides.constants.ts`, `sortKeys.constants.ts`, `statusChips.constants.ts` mit UI-Mapping-Tables (`PROVIDER_BRAND_ICONS`, `PR_STATE_UI`, `CI_STATE_UI`, `IDE_UI`, …) | ✅ (Plan 3) |
| C5 | 3.6 | `DetailPane` + `WindowChrome` als Layout-Organisms in `components/organisms/layout/` | Nur `Header` + `Sidebar` vorhanden — kein `DetailPane`, kein `WindowChrome` | **P1** |
| C6 | 3.9 | Molecules: `KpiCard`, `KpiTile`, `InfoCard`, `InfoHint`, `SettingsField`, `SettingsSectionHeader`, `OpenInIdeButton`, `DetailSection`, `MrChip`, `BranchFilterChip`, `ExternalLinkButton`, `EmptyState` | `EmptyStatePlaceholder` vorhanden in `placeholders/`. **`KpiCard`/`KpiTile`** fehlt komplett (Gap 11.2 + 1.2). `MrChip`/`BranchFilterChip` fehlt. `OpenInIdeButton`, `DetailSection`, `InfoCard/Hint`, `ExternalLinkButton` als Molecule fehlt | **P1** |
| C7 | 3.8 + 3.9 Checklist | Jede migrierte Component hat ≥1 Story | **0 Stories** im gesamten `app/src/` (`find … -name "*.stories.tsx"` → leer). Storybook-Decorator existiert, aber keine Inhalte | **P1** |
| C8 | 3.8 + 3.9 Checklist | Jede Atom/Molecule hat ≥1 Test | **1 einzige** Testdatei (`theme/index.test.ts`). Atom/Molecule/Organism-Tests komplett fehlen | **P0** |
| C9 | 3.7 | `useThemeEffect` ggf. entfernen oder reduzieren | Stattdessen `useThemeAttribute.ts` neu — funktional erfüllt; verifiziert | ✅ |
| C10 | 3.5 | `routes.tsx` extrahiert aus `App.tsx` | Nicht verifiziert, aber `App.tsx` existiert top-level — Pages werden über `pages/app/*/index.tsx` geladen | ⚠ |

## D. Phase 4 — Domain Ports

| # | Plan-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| D1 | 4.2 / Gap 2.4 | Repos: Klick auf Zeile öffnet Detail-Pane (state-getriggert) | Gap-Doc dokumentiert: aktuell nur `data-repo-id` Klick = Highlight, kein State-Toggle. Detail-Pane nur via URL `/repos/:id` erreichbar | **P1** |
| D2 | 4.3 / Gap 4.2 + 15.8 | MR-Drawer `size="md"` (~420 px) statt `size="lg"` (640 px) | Aktueller Wert nicht in dieser Session verifiziert, aber Gap-Doc P1 noch offen | **P1** |
| D3 | 4.4 / Gap 6.1 | ActivityPage komplett portiert (alle 18 Cards) | **18 Activity-Cards sind alle vorhanden** in `app/src/components/organisms/activity/cards/` ✅ und werden in `Activity/index.tsx` importiert. Page hat **471 LOC** vs. alte 392 LOC | ✅ |
| D4 | 4.8 / Gap 7.1 | RepoDetailPage komplett (KPI + Activity-Chart + WorkingTree + MR-Liste + RecentCommits) | `RepoDetail/index.tsx` hat **816 LOC** (vs. alte 698) — Portierung **scheinbar erledigt**; visuelle Verifikation aber nicht durchgeführt | ⚠ |
| D5 | Gap 5.1 / 15.6 | Branches Hydration-Bug `<button>` in `<button>` fixen | `FetchBtn = styled("button")` (Z.293) bleibt; aber Parent ist jetzt `role="button"` (Z.922 in `index.tsx`) — **Fix scheinbar drin**, manuell verifizieren | ⚠ |
| D6 | 4.9 | Onboarding-Domain (Wizard, FirstRun-Detection) | Kein `app/src/pages/app/Onboarding/` und kein `onboarding/`-Sub-Folder gefunden | **P1** |
| D7 | 4.10 | Search/cmdk Command-Palette in `app/src/components/organisms/search/` | Folder existiert ✅ — Inhalt nicht stichprobenartig geprüft | ⚠ |
| D8 | 4.11 | Brand + Feedback Domain | `components/atoms/brand/`, `components/atoms/feedback/`, `organisms/banners/` vorhanden | ⚠ |
| D9 | 4.X.8 | Magic-Strings pro Feature auf Konstanten ziehen | testIds, storage-keys, providers, PR/CI-states, IDEs, sort/status-chips alle zentralisiert. ESLint `no-restricted-syntax` blockiert Rückfall | ✅ (Plan 3) |
| D10 | 4.X (i18n) | Strings via `t()` aus Namespaces | Nicht stichprobenartig verifiziert; Locales-Folder existiert | ⚠ |
| D11 | Gap 2.2 + 15.5 | IDE-/Provider-Icons gefüllt + 16×16 statt outlined 13×13 | Offen laut Gap-Doc | **P1** |
| D12 | Gap 5.2 / 15.6 | Pills (`current`, `clean`, `dirty`, `remote`) **UPPERCASE** + Drawer-Sections + Search-Sections | Offen laut Gap-Doc 15.12 | **P1** |
| D13 | Gap 0.4 / 15.1 | Sidebar-Footer-Version `Recrest · v0.7.0` | Offen | **P2** |
| D14 | Gap 11.2 | Repos-Domain-Dialoge: `CreateBranchDialog`, `FindAcrossReposDialog`, `ImportFromProviderDialog`, `ChangedFilesList`, `RepoStats` | Nicht verifiziert ob diese in der neuen Struktur existieren; Repos-Folder durchsuchen | **P1** |
| D15 | Gap 11.2 (Atoms) | `AheadBehind`-Atom als wiederverwendbarer Renderer (statt inline in RepoRow) | Folder `components/atoms/badges/` & `data/` existiert — `AheadBehind` nicht direkt sichtbar | **P1** |
| D16 | Gap 11.2 (Atoms) | `Kbd`-Atom als wiederverwendbares Pill | Inline in Search, kein eigener Folder | **P1** |
| D17 | 4.X.10 | E2E grün am Ende von Phase 4 | Nicht in dieser Analyse ausgeführt | ⚠ |

## E. Phase 5 — Cleanup + Gates

| # | Plan-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| E1 | 5.1 / 5.3.1 | `@radix-ui/*` Deps entfernen | `package.json` hat **0 Radix-Pakete** ✅ | ✅ |
| E2 | 5.1 / 5.3.2 | `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `tailwind-merge`, `class-variance-authority` entfernen | **0 Treffer** in `package.json` ✅. Auch keine Tailwind-Klassen in `app/src/` (`rg "tailwind|@tailwindcss"` → 0 Treffer) ✅ | ✅ |
| E3 | 5.2 | `src-old/` gelöscht | ✅ (sogar zu früh — vor Plan-Reihenfolge) | ✅ |
| E4 | 5.3.3 | Keine SCSS-Files mehr in `app/src/` (außer `page-anim.scss` + ggf. `window-chrome.scss`) | `find app/src -name "*.scss"` → **0 Treffer**. Auch `page-anim.scss` fehlt — das ist Plan-konform (3.1 Carve-out), aber Animationen müssen jetzt anderswo leben | ⚠ |
| E5 | 5.4 | `app/src/styles/` enthält nur noch nötige Files | Nur `globals.css` vorhanden ✅ — minimal | ✅ |
| E6 | 5.5.1 | ESLint `no-restricted-imports` blockiert `@radix-ui/*` | Nicht verifiziert in dieser Analyse | ⚠ |
| E7 | 5.5.3 | ESLint `no-restricted-syntax` blockiert Magic-Strings (Events, testIds, Storage-Keys) | Aktiv in `app/eslint.config.js` mit Overrides für `src/lib/constants/**`. Blockiert `data-testid`-Literale, `recrest:`-Strings, inline `invoke`/`listen`/IPC-Schemas | ✅ (Plan 3) |
| E8 | 5.6 | `useThemeEffect` ggf. entfernen | Ersetzt durch `useThemeAttribute` ✅ | ✅ |
| E9 | 5.7 | Bundle-Size dokumentiert, ≤ +30% Pre-Phase-1-Baseline | Keine Messung in dieser Analyse | ⚠ |
| E10 | 5.8 / Gap | Visual-Diff in allen 4 Themes (`light/dark/oled/glassy`) abgenommen | Gap-Doc dokumentiert Drift in Light + Dark — kein Vergleich für `oled`/`glassy` | **P1** |
| E11 | 5.10 | `CLAUDE.md` aktualisiert (kein Tailwind/Radix-Erwähnungen mehr) | `CLAUDE.md` referenziert nicht-existente Pfade — Stichprobe nicht durchgeführt, aber gemäß Konversation noch nicht aktualisiert | **P1** |
| E12 | 5.10 | `components/README.md`, `pages/README.md`, `lib/README.md`, `store/README.md` mit Atom/Molecule/Folder-Konvention | Nicht erstellt | **P2** |
| E13 | 5.10 | `docs/plans/02-material-ui-migration.md` als "Status: abgeschlossen" markiert | Nicht | **P2** |
| E14 | 5.11 | `madge --circular` 0 Zyklen | Nicht ausgeführt | ⚠ |

## F. Gap-Analyse-Roadmap (`MIGRATION_GAP_ANALYSIS.md`) — P0/P1 noch offen

| # | Gap-Ref | Soll | Ist | Schwere |
|---|---|---|---|---|
| F1 | 13/16 P0.1 | Theme-Persistence repariert | Anti-Flash-Script + `resolveBootTheme()` drin — ✅ Subjekt zu manueller Verifikation | ✅ |
| F2 | 13/16 P0.2 | Branches Hydration-Bug | Wahrscheinlich gefixt (siehe D5) | ⚠ |
| F3 | 13/16 P0.3 | RepoDetailPage portiert | LOC stimmt, aber visuelle Verifikation offen (siehe D4) | ⚠ |
| F4 | 13/16 P0.4 | ActivityPage portiert | Alle Cards importiert ✅ | ✅ |
| F5 | 16 P1.5 | Globale Sizing-Tokens (Header 64, Buttons 38, KPI-Value 44, Sidebar-Item 14/500) | Sidebar in jüngster Session auf 64px Brand-Row + 209/49 fix — Header-Höhe + Button-Sizes nicht systematisch | **P1** |
| F6 | 16 P1.6 | Active-Nav-Highlight orange-tinted + orange Text | Nicht verifiziert | **P1** |
| F7 | 16 P1.7 | Brand-Logo Web-Mode normal-Variante | `useFaviconSync` existiert (dev-aware), Logo-Component nicht stichprobenartig geprüft | ⚠ |
| F8 | 16 P1.8 | Pill-Casing UPPERCASE | Offen | **P1** |
| F9 | 16 P1.9 | Drawer-Breite + Drawer/Overlay-Schatten | Offen | **P1** |
| F10 | 16 P1.10 | Dark-Mode body-BG dunkler + Activity-Bar dotted+Outline | Offen | **P1** |
| F11 | 16 P1.11 | IDE-Icons gefüllt 16×16 | Offen | **P1** |
| F12 | 16 P1.12 | Sparkline in RepoRow auf ~110×30 (aktuell 11×11) | Offen | **P1** |
| F13 | 16 P1.13 | Settings-Felder ohne Wrapper-Card-Border | Offen | **P1** |
| F14 | 16 P1.14 | MR-Drawer Section-UPPERCASE + Plus-Icon vor "Branch" | Offen | **P1** |
| F15 | 16 P1.15 | Sidebar-Settings-Footer mit Version | Offen | **P2** |
| F16 | 16 P1.16 | Pull-Button als primary im Detail-Pane | Offen | **P2** |
| F17 | 16 P2 17–24 | Default/Cards-Toggle als Pill-Group · Search-Section-Casing · Detected:macOS Untertitel · Tab via URL-Query · Detail-Pane-Click-Trigger · Stub-Terminal-Icon entfernen · Filter/Filters Wording · Tooltip-`<span>`-Warnings | Alle offen | **P2** |

---

## Priorisierte Backlog-Empfehlung

**P0 (blockiert Plan-Gates, sofort)**
1. ✅ **`testIds.constants.ts` anlegen** + alle `data-testid` migrieren (C2 / D9 / E7) — siehe `docs/plans/PLAN_MAGIC_STRINGS.md`.
2. ✅ **`storage.constants.ts` anlegen** + alle `"recrest:..."` Strings migrieren (C3).
3. ✅ **`providers.constants.ts`, `prStates.constants.ts`, `ciStates.constants.ts`** anlegen + Konsumenten umstellen (C4) — plus `ides`, `sortKeys`, `statusChips`.
4. **Atom-/Molecule-Tests** (C8) — mindestens für `GeneralButton`, `GeneralButtonGroup`, `GeneralIconButton`, `GeneralDrawer`, `ConfirmDialog`. ⏳ noch offen
5. ✅ **ESLint `no-restricted-syntax`** scharfschalten (E7) — aktiv in `app/eslint.config.js`.

**P1 (Plan fordert, fehlend)**
6. **Stories** anlegen (C7) — pro Atom/Molecule mindestens eine. Theme-Toolbar wirkt sonst nicht.
7. **Settings UI: Accent-Picker + Theme-Palette-Story** (A1, A2).
8. **DetailPane + WindowChrome** als Layout-Organisms (C5).
9. **`KpiCard`/`KpiTile`/`MrChip`/`BranchFilterChip`/`OpenInIdeButton`/`AheadBehind`/`Kbd`** als wiederverwendbare Atoms/Molecules (C6, D15, D16).
10. **Onboarding-Domain** portieren (D6).
11. **Repos-Dialoge** (`CreateBranchDialog`, `FindAcrossReposDialog`, `ImportFromProviderDialog`, `ChangedFilesList`, `RepoStats`) (D14).
12. **Visual-Drift-Liste** abarbeiten (F5–F14) — UPPERCASE-Pills, Drawer-Breite, IDE-Icons gefüllt, Sparkline-Größe, Settings-Field-Wrapper, Header-Heights.
13. **`CLAUDE.md` aktualisieren** (E11).

**P2 (Polish + Plan-Hygiene)**
14. README-Pflicht pro Top-Folder (E12).
15. Bundle-Size-Messung + Dokumentation (E9).
16. `madge --circular` Lauf (E14).
17. Visual-Diff für `oled` + `glassy` (E10).
18. Phase-Plan Status-Tag (E13).
19. Restliche Gap-Doc-P2-Items (F17).

---

## Anmerkungen zur Plan-Reihenfolge

- **`src-old/` wurde vor Abschluss von Phase 4 gelöscht** (E3 ist eigentlich erst Phase-5-Schritt). Das macht Visuelle-Parität-Vergleiche jetzt nur noch über `docs/visual-baseline/src-old/` PNG-Snapshots möglich, nicht mehr über `git stash && yarn dev`. Akzeptabel, aber dokumentationsabhängig.
- **Konstanten-Disziplin (Phase G im Hauptplan, verteilt in Phase 3 + 4 in Steps-Plan) ist die größte offene Lücke.** Die Sub-Phase wurde übersprungen, obwohl Phase 5.5.3 darauf aufbaut.
- **Stories-/Test-Lücke ist plan-überdeckend** — sowohl Phase 3 als auch Phase 4 fordern ≥1 Story + Test pro Component. Die Realität ist 0 Stories + 1 Test im ganzen `src/`.
