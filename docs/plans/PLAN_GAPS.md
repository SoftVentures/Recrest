# Plan 2 — Offene Lücken

**Stand:** 2026-05-25
**Branch:** `feature/phase-two-mui-migration`
**Methode:** Nur was wirklich noch offen ist. Erledigtes ist in `git log -- docs/plans/PLAN_GAPS.md` nachvollziehbar.

Schwere: **P1** = Plan fordert es explizit, Code fehlt · **P2** = Convenience / Plan-Hygiene.

---

## P1 — Plan fordert, Code fehlt

### D14 — Repos-Domain: Aufrufer + Stories

Die vier Components (`CreateBranchDialog`, `FindAcrossReposDialog`, `ChangedFilesList`, `RepoStats`) existieren, sind aber noch nicht überall verdrahtet.

- `RepoDetail/index.tsx` rendert weiterhin die inline-`KpiGrid`/`FileList`/`FileKindBadge` statt `RepoStats`/`ChangedFilesList`. Refactor ist Backwards-kompatibel (kein Visual-Diff erwartet, nur LOC-Reduktion).
- Branch-Button im `RepoDetail`-Header ist `disabled`; muss `CreateBranchDialog` öffnen.
- `FindAcrossReposDialog` hat keinen Trigger. Vorschlag: `Cmd+Shift+F` global + Header-Aktion.
- `.stories.tsx` für alle vier Components.

### D6 — Onboarding: ConnectProviderStep + Stories + Multi-Step-Test

- `ConnectProviderStep` ist heute Skip-only. Plan-Soll: PAT-Input + Connect-Flow (mind. GitHub) — analog Settings/Integrations.
- Stories pro Step fehlen.
- `OnboardingWizard.test.tsx` deckt nur den Mount-Path ab; fehlt: Step-zu-Step-Navigation, Finish-Path.

### C6 / D15 / D16 — Restliche Atoms + Migration der Inline-Kopien

- `MrChip`, `BranchFilterChip`, `OpenInIdeButton` noch nicht extrahiert.
- Die drei bereits extrahierten Primitives (`Kbd`, `AheadBehind`, `KpiCard`) sind im Code noch nicht durchgängig die Single-Source-of-Truth — Inline-Definitionen in Header, OverallSearch, ShortcutsTab, Dashboard, RepoRow, RepoCard, DetailPane, RepoDetail leben weiter.

### E10 — Visual-Diff `oled` + `glassy`

Light + Dark abgenommen. OLED + Glassy brauchen einen Playwright-Sweep über Dashboard, Repos, Branches, Activity, Settings, Modal-Stack. Risiko: `surface.interface.base` kollabiert in OLED zu `#000000` → Card-Konsumenten könnten Kontrast verlieren.

---

## P2 — Polish + Plan-Hygiene

| Gap | Soll                                                                                              | Status                                                                  |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| E9  | Bundle-Size dokumentiert, ≤ +30% Pre-Phase-1-Baseline                                             | Keine Messung dokumentiert.                                             |
| E12 | `components/README.md`, `pages/README.md`, `lib/README.md`, `store/README.md`                     | Fehlen.                                                                 |
| E13 | `02-material-ui-migration.md` als "Status: abgeschlossen" markieren                               | Nicht.                                                                  |
| E14 | `madge --circular` 0 Zyklen verifizieren                                                          | Skript existiert (`yarn dep-graph:circular`), Lauf nicht dokumentiert.  |
| F15 | Sidebar-Footer-Version `Recrest · v0.7.0`                                                         | Fehlt.                                                                  |
| F17 | Visual-Drift-Microfixes (UPPERCASE-Pills, IDE-Icons 16×16, Sparkline-Größe, Pull-Button primary…) | Teilweise erledigt, nicht vollständig durchgehärtet.                    |

---

## Priorisierte Backlog-Empfehlung

1. **D14-Wiring** — schnellster sichtbarer Gewinn (Branch-Button funktional, KpiGrid auf neues `RepoStats`).
2. **C6/D15/D16-Migration** — Inline-Kopien durch neue Primitives ersetzen.
3. **D6 ConnectProviderStep** — echter PAT-Flow.
4. **Stories nachziehen** — `.stories.tsx` für D14-Dialoge + Onboarding-Steps + restliche Atoms.
5. **MrChip / BranchFilterChip / OpenInIdeButton** extrahieren.
6. **E10** — OLED/Glassy-Sweep.
7. **P2-Items** danach.
