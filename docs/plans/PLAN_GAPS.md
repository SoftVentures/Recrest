# Plan 2 — Offene Lücken

**Stand:** 2026-05-26
**Branch:** `feature/phase-two-mui-migration`
**Methode:** Nur was wirklich noch offen ist. Erledigtes ist in `git log -- docs/plans/PLAN_GAPS.md` nachvollziehbar.

Schwere: **P1** = Plan fordert es explizit, Code fehlt · **P2** = Convenience / Plan-Hygiene.

---

## P1 — Plan fordert, Code fehlt

### Changes-Page — Follow-ups zum Redesign

Die Page wurde von `<ReposPage dirtyOnly />`-Wrapper auf eine eigene expandable Repo→Files-Ansicht umgebaut: Toolbar mit Suchinput (Repo-Name + Pfad + Datei-Pfad), expandable Repo-Rows mit `ChangedFilesList` als Sub-Liste, Open- + Pull-Button pro Row. Offen:

- **Direct-Actions pro Repo:** Commit / Stash / Discard direkt aus der Row (heute öffnet "Open" nur das RepoDetail).
- **File-Level Diff-Preview:** Klick auf eine Zeile in der expandierten Datei-Liste sollte ein Diff-Drawer öffnen — heute kein Click-Handler.
- **Multi-Select:** Checkboxes auf File-Ebene für Batch-Commit / Batch-Discard.
- **Stories:** `Changes.stories.tsx` (oder als Page-Story unter `Pages/Changes`).
- **Tests:** Expand-Toggle, Filter-Match-über-Datei-Pfad, Empty-State.

### Restliche D16-Atoms

- `MrChip` (MR-State-Pill für `open` / `draft` / `closed` / `merged`) — heute lebt nur `DraftPill` lokal in MR-DetailPanel-Styles.
- `BranchFilterChip` — heute liegen die ahead/behind/dirty/clean Tone-Variants als `Tag` / `Trk` in den Branches-Page-Styles. Mehrwert einer Extraktion: nur wenn ein anderer Konsument kommt.

Begründung warum bisher ausgelassen: tone-variants haben **keine Cross-Page-Konsumenten** — eine Extraktion würde nur das Verschieben von Code bedeuten, kein neues Behavior. Sollte erst angefasst werden, wenn ein zweiter Aufrufer dazukommt.

---

## P2 — Polish + Plan-Hygiene

| Gap | Soll                                                                              | Status                                                                 |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| E9  | Bundle-Size dokumentiert, ≤ +30% Pre-Phase-1-Baseline                             | Keine Messung dokumentiert.                                            |
| E13 | `02-material-ui-migration.md` als "Status: abgeschlossen" markieren               | Nicht.                                                                 |
| E14 | `madge --circular` 0 Zyklen verifizieren                                          | Skript existiert (`yarn dep-graph:circular`), Lauf nicht dokumentiert. |
| F17 | Visual-Drift-Microfixes (UPPERCASE-Pills, IDE-Icons 16×16, Sparkline-Größe, etc.) | Teilweise erledigt, nicht vollständig durchgehärtet.                   |

---

## Priorisierte Backlog-Empfehlung

1. **Changes-Page Direct-Actions + Diff-Preview** — größter sichtbarer UX-Gewinn nach dem Redesign.
2. **`MrChip` extrahieren**, sobald ein zweiter Konsument neben `DraftPill` aufkommt.
3. **P2-Items** danach (Bundle-Size, READMEs, Plan-Status, madge-Lauf, Sidebar-Version, Visual-Drift).
