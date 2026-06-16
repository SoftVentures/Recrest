# Recrest Q3 Bugfix & UX-Sweep — Plan-Index

**Spec:** [`docs/superpowers/specs/2026-06-16-q3-bugfix-sweep-design.md`](../../superpowers/specs/2026-06-16-q3-bugfix-sweep-design.md)
**Branch:** `bugfix/fix-several-recrest-issues` — alles passiert in diesem Branch, keine Sub-Branches, keine PRs.
**Scope:** 43 gesammelte Issues in 11 Phasen.

## Reihenfolge

1. **[01-quick-wins.md](./01-quick-wins.md)** — Phase 1: 6 kleine Bugs (Plural, Coral, macOS-15, Branch-Icons, Storage-Rename, Open-Folder)
2. **[02-i18n-plural-audit.md](./02-i18n-plural-audit.md)** — Phase 1.5: i18next-Pluralisierung in beiden Locales überall
3. **[03-static-data-sweep.md](./03-static-data-sweep.md)** — Phase 1.7: keine hardcoded „Fakten" mehr
4. **[10-ux-feedback-pattern.md](./10-ux-feedback-pattern.md)** — Phase 7: `useActionFeedback` + Button-States (vorgezogen)
5. **[07-theme-system.md](./07-theme-system.md)** — Phase 4a: Boot-Theme-Flash, Demo-Sync, Glassy cross-platform, OLED Black, Theme-Flicker-Audit
6. **[04-onboarding-wizard.md](./04-onboarding-wizard.md)** — Phase 2: PatHelpPanel, GitLab-Sub-Onboarding, Zurück-Button, Post-Wizard-Activity, Crash-Reports-Opt-in, Default-Ordner raus, Quality-Pass
7. **[05-provider-trust.md](./05-provider-trust.md)** — Phase 3: echter Verify-Call, strukturierte Errors, Single-Save-Form, Back-to-Default
8. **[06-discovery.md](./06-discovery.md)** — Phase 4: Bundle-/Registry-/Desktop-File-Discovery für Terminals + IDEs, Custom-Terminal-Test-Button
9. **[08-ssh-simplification.md](./08-ssh-simplification.md)** — Phase 5: SSH-Key-Discovery + Default, Agent-Modus raus
10. **[09-repo-actions.md](./09-repo-actions.md)** — Phase 6: provider-aware „Auf Host öffnen", Pull/Fetch/Push, Branch-Pagination/Suche/Delete
11. **[11-ui-polish.md](./11-ui-polish.md)** — Phase 8: Logo-Nav, ActivityChart 24h+Icons, Code-Ligaturen-Switch, Shortcuts-Audit, macOS-Icon-Audit, gefoldete Sidebar
12. **[12-landingpage.md](./12-landingpage.md)** — Phase 9: `/download`-Route, direkte Links, Install-Instructions, Quality-Audit

## Pro-Phase Akzeptanz-Stichprobe

- **Phase 1:** „1 Repository in 1 Ordner gefunden." korrekt; Akzent-Label „Coral Orange"; Settings → neue System-Sektion mit echten Werten; „Im Ordner öffnen" zeigt Repo-Inhalt
- **Phase 1.5:** `yarn audit:i18n` exit 0
- **Phase 1.7:** `yarn audit:static` zeigt nur erwartete Treffer
- **Phase 7:** Reload-Button blitzt nach Refresh grün; Copy-Button grünes Häkchen
- **Phase 4a:** Cold-Boot auf macOS-Dark zeigt nie weiß länger als 1 Frame
- **Phase 2:** Wizard EN+DE komplett klickbar; nach Abschluss zeigt Dashboard sofort Activity
- **Phase 3:** `www.hurensohn.de` + `1234` → klare Fehlermeldung, nicht „connected"
- **Phase 4:** Kitty installiert → erscheint im Terminal-Picker
- **Phase 5:** Default-SSH-Key vorausgewählt
- **Phase 6:** „Auf $Provider öffnen" zeigt Provider-Namen; bei nicht-connected zeigt Modal; Branches 25er-Pagination + Suche + Delete
- **Phase 8:** Logo navigiert zu Dashboard; 10 Shortcuts funktionieren wie gelistet
- **Phase 9:** Download-CTA → `/download`; jeder Asset-Klick startet direkten Download

## Commit-Konvention

Pro Task in den Plans: ein Commit oder eine kleine Reihe Commits — siehe Memory `feedback_never_commit`: ich übergebe sauberen, uncommitted Stand pro Phase zur User-Review, du commitest.
