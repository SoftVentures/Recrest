# Akzeptanz-Checkliste

Jedes Item aus `docs/plans/future.md` als überprüfbarer Checkbox. Hak ab, sobald du das beobachtbare Verhalten verifiziert hast (nicht sobald der Code gemerged ist — Akzeptanz-Kriterium ist immer "User-sichtbar funktioniert").

Spalten-Konvention pro Item: `- [ ] <ID> — <Akzeptanz-Kriterium> (→ Plan N §X.Y)`.

---

## Foundations (Cross-Plan)

- [ ] **F.1** — `app/src-tauri/src/config/settings.rs` hat alle 11 neuen Felder mit `#[serde(default)]`; Migrations-Test lädt eine alte `settings.json`-Fixture ohne neue Felder ohne Error. (→ Plan 1 §0.1)
- [ ] **F.2** — Neues Drawer-Primitive `app/src/components/molecules/Drawer/index.tsx` existiert und exportiert die Phase-0.2-Prop-Surface. (→ Plan 1 §0.2)
- [ ] **F.3** — `app/src/lib/charts/palette.ts` existiert; `ACTIVITY_PALETTE` ist daraus migriert; alle Activity-Cards importieren von dort. Kein `ACTIVITY_PALETTE`-Vorkommen mehr in `activityStats.ts`. (→ Plan 1 §0.3)
- [ ] **F.4** — `lib/tauri.ts` taucht in keinem Plan-Edit als Pfad mehr auf — nur `lib/tauri/index.ts`. `r#trait.rs` taucht als Datei-Pfad nirgends mehr auf. (→ Plan 1 §0.5)

---

## Plan 1 — Bugs & UI Polish

### Plattformübergreifende Bugs

- [ ] **1.A1** — In MR-View und Repo-Detail-View ist der Drawer optisch identisch (gleicher Padding/Schatten/Animation, verifizierbar via DevTools `getComputedStyle`). ESC-Key und Click-Outside schließen ihn in beiden. (→ Plan 1 §A.1)
- [ ] **1.A2** — PR auf GitHub erstellen ohne Self-Assignment → keine OS-Notification. PR sich selbst zuweisen → Notification kommt. PR-Liste in der UI zeigt **alle** PRs unabhängig vom Assignee. Cold-Start ohne geladene Identity → keine falschen Notifications. (→ Plan 1 §A.2)
- [ ] **1.A3** — Activity → Review-Queue mit absichtlich überlangem Repo-Namen: Label endet mit `…`, kein horizontaler Overflow. Stichprobe in 3 weiteren Cards bestätigt selbes Verhalten. (→ Plan 1 §A.3)
- [ ] **1.A4** — Repo mit Commits unter "Röhle <ö@x>" und "Roehle <oe@x>" → Leaderboard zeigt **eine** Zeile. Test-Repo mit französischen/polnischen/türkischen Diakritika ebenfalls korrekt vereint. Manuelles Override über `authorAliases` möglich. (→ Plan 1 §A.4)
- [ ] **1.A5** — Repo pinnen → erscheint in eigener Sektion oben über allen Folder-Gruppen. App neu starten → Pin bleibt persistent. (→ Plan 1 §A.5)
- [ ] **1.A6** — Failing CI auf GitHub-Repo zeigt Notification "Checks failed". Failing CI auf GitLab/Bitbucket zeigt "Pipelines failed". Status-Chip in RepoRow nutzt selbe Vokabel. (→ Plan 1 §A.6)
- [ ] **1.A7** — In Repo-Detail-View auf eine offene PR klicken → Drawer öffnet inline; URL bleibt auf Repo-Detail (kein Page-Switch). (→ Plan 1 §A.7)

### UI / Visuelle Bugs

- [ ] **1.B1** — Dashboard "Languages"-Card: Donut nimmt deutlich mehr Höhe als vorher, Legende liegt darunter (nicht daneben). Bei Card-Breite ≤280px wird Legende zu Single-Column. (→ Plan 1 §B.1)
- [ ] **1.B2** — 24 Repo-Default-Avatare nebeneinander zeigen kein einheitliches "alle hellen Pixel oben links" mehr — Gradient-Richtung variiert deterministisch. (→ Plan 1 §B.2)
- [ ] **1.B3** — Repo X hat dieselbe Farbe in Donut, Bar, Line, Area, Heatmap. Hover-Faded-Variante folgt einheitlicher HSL-Funktion. (→ Plan 1 §B.3)

### macOS

- [ ] **1.C1** — App per X schließen → ist im Tray, nicht im Dock. cmd+Space → "Recrest" → Enter → Fenster erscheint im Vordergrund. (→ Plan 1 §C.1)

### Windows

- [ ] **1.C2** — Hover über Maximize-Button (rechts oben) → Windows-Snap-Layouts-Flyout erscheint. Hover über Minimize/Close → OS-Tooltip in System-Sprache (kein Doppel-Tooltip). (→ Plan 1 §C.2)
- [ ] **1.C3** — Settings → "Start with system" ON → Reboot → App startet im Tray. Registry-Eintrag unter `HKCU:\…\Run` zeigt korrekten installierten EXE-Pfad. (→ Plan 1 §C.3)
- [ ] **1.C4** — Settings → "Start minimized" + "Close to tray" → App startet ohne Taskbar-Eintrag, nur im Tray. Kombinations-Matrix dokumentiert + erwartbares Verhalten konsistent. (→ Plan 1 §C.4)

### Linux

- [ ] **1.C5** — Auf Wayland-Session (Hyprland/GNOME-Wayland): App rendert nativ, `xeyes` zeigt sie nicht (kein XWayland). Auf X11-Session: App startet trotzdem (Fallback greift). (→ Plan 1 §C.5)
- [ ] **1.C6** — Auf 4K-Display (Arch + Hyprland): UI in nativer Größe, keine doppelte Skalierung. Mehrere Monitore mit unterschiedlicher Skala: korrekte Größe pro Monitor. (→ Plan 1 §C.6)
- [ ] **1.C7** — dunst auf Arch zeigt Recrest-Logo bei jeder Notification. Plasma/KDE und GNOME-Shell ebenfalls. (→ Plan 1 §C.7)

### Allgemeine UX-Verbesserungen

- [ ] **1.D1** — RepoList unter ~720px Container-Breite wechselt automatisch zur Card-Ansicht. View-Toggle (Grouped/Flat/Card) im Page-Header funktioniert; Wahl überlebt Reload. (→ Plan 1 §D.1)
- [ ] **1.D2** — Branch-View hat: ausklappbare Sektionen (Local/Remote/Stale/…), Such-Input, Status-Filter. (→ Plan 1 §D.2)
- [ ] **1.D3** — Click auf "Repo entfernen" / "Force Push" / "Discard Changes" / "Token-Reset" zeigt Confirmation-Dialog. Setting "Confirm risky actions" steuert das. (→ Plan 1 §D.3)
- [ ] **1.D4** — Onboarding-Wizard: konsistenter "Zurück"-Button im Footer aller Steps (außer Step 0). Form-Eingaben bleiben beim Zurück erhalten. (→ Plan 1 §D.4)
- [ ] **1.D5** — Drawer schließt per Swipe nach rechts. Page-Switch per horizontalem Swipe. Mindestens 2 Use-Cases dokumentiert + getestet. (→ Plan 1 §D.5)
- [ ] **1.D6** — Cmd/Ctrl + `+` / `-` / `0` skaliert UI live. Slider in System-Settings reflektiert dieselbe Skala (bidirektional gesynct). Skala persistiert. (→ Plan 1 §D.6)
- [ ] **1.D7** — Activity-Page scrollen, weg navigieren, zurück → Scroll-Position wiederhergestellt. Selbes für Repo-List, MR-List. (→ Plan 1 §D.7)

---

## Plan 2 — Repo Management & Git Actions

### Bugs (Repo-Aktionen kaputt)

- [ ] **2.A1** — "Open in Terminal" funktioniert auf macOS (Terminal+iTerm+Warp), Linux (kitty/foot/wezterm/alacritty/gnome-terminal/konsole), Windows (wt/pwsh/powershell/cmd) je nach gewähltem Terminal in Plan 3 §D.1. Pfade mit Spaces/Sonderzeichen funktionieren. (→ Plan 2 §A.1)
- [ ] **2.A2** — "Open in Folder" markiert das Repo-Verzeichnis im Datei-Explorer (Finder zeigt es selektiert auf macOS, Explorer markiert auf Windows, xdg-open öffnet auf Linux). In Production-Build (nicht nur Dev) funktioniert es. (→ Plan 2 §A.2)

### Repo-Verwaltung (Polish)

- [ ] **2.B1** — Repo-Import-Wizard hat Felder vorausgefüllt aus `repoImportDefaults` (Provider, Scan-Path, Group). Checkbox "Als Default speichern" funktioniert. (→ Plan 2 §B.1)
- [ ] **2.B2** — Settings → Storage zeigt Radio "Default" neben jedem Scan-Path. Wahl wird beim Repo-Import übernommen. (→ Plan 2 §B.2)
- [ ] **2.B3** — Repo ohne lokales Logo + ohne Brand-Match: zeigt Favicon des Origin-Hosts (falls Setting `privacy.fetchFavicons = true`). PNG-Bombe im Test-Server wird abgelehnt. SVG mit `<script>` wird abgelehnt. Self-signed Cert nur mit explizitem Allow. (→ Plan 2 §B.3)
- [ ] **2.B4** — Click auf Pin-Icon im RepoRow toggelt Pin (vorher nur per Dropdown möglich). Tooltip ändert sich. (→ Plan 2 §B.4)
- [ ] **2.B5** — RepoList-Toggle "Grouped/Flat" verfügbar. Im Flat-Mode: sortierbarer Header (Name/Branch/Status/Activity), Klick toggelt Asc/Desc. Sort-State persistiert. Pinned bleibt oben. (→ Plan 2 §B.5)
- [ ] **2.B6** — Per-Repo-Settings haben SSH-Key-Picker. Override greift (Test mit privatem Repo + Custom-Key). Passphrase wird nur in-Memory gespeichert. (→ Plan 2 §B.6)

### Git-Aktionen

- [ ] **2.C1** — Working-Copy-Panel im Repo-Detail listet geänderte Files mit Stage/Unstage-Checkboxes. Discard `.env` zeigt Confirmation-Dialog. Submodule-Pfad wird nicht descendet. (→ Plan 2 §C.1)
- [ ] **2.C2** — Commit-Dialog hat "Default-Template einfügen"-Button (`{author}: {date}` rendered). Custom-Message möglich. Repo mit `pre-commit`-Hook (z.B. linting): Hook läuft tatsächlich (Failure blockt Commit), Badge "Hooks aktiv" sichtbar. Repo ohne Hook: libgit2-Pfad. (→ Plan 2 §C.2)
- [ ] **2.C3** — Settings → Git Config Tab zeigt `user.name`, `user.email`, `core.editor` etc. — editierbar. Per-Repo-Override funktioniert. (→ Plan 2 §C.3)
- [ ] **2.C4** — Repo-Detail Tab "CI": Liste der Workflows (GitHub Actions / GitLab Pipelines / Bitbucket Pipelines), Run-History, "Run workflow"-Button mit dynamischem Inputs-Form (für GitHub aus YAML; GitLab als Variables; Bitbucket leer). (→ Plan 2 §C.4)
- [ ] **2.C5** — MR-Drawer hat Tab "Files Changed" mit Diff-Renderer. Inline-Comment-Composer funktioniert. Bundle-Größe ≤80KB gzipped (verifiziert). (→ Plan 2 §C.5)
- [ ] **2.C6** — Repo mit GitHub Pages aktiviert: Block "Deployments" zeigt URL + Status. GitLab-Pages-Repo analog. Bitbucket-Repo mit `aws-s3-deploy` in Pipelines: zeigt "Pipelines-basiertes Deploy erkannt". (→ Plan 2 §C.6)

### Provider-Integration

- [ ] **2.D1** — GitLab-PR zeigt Author-Avatar + Display-Name (nicht Username). Bitbucket-PR ebenfalls. (→ Plan 2 §D.1)
- [ ] **2.D2** — Sidebar/Filter-Dropdown listet GitHub-Orgs, GitLab-Groups, Bitbucket-Workspaces. Auswahl filtert Repo-Liste/Import. (→ Plan 2 §D.2)

---

## Plan 3 — Activity / Statistics / Dashboard & Settings & Quality

### Charts (Polish)

- [ ] **3.B1** — MR-Velocity-Card zeigt geschwungene Linie (keine Knicke). Edge-Cases (0/1/2 Punkte) crashen nicht. (→ Plan 3 §B.1)

### Activity / Statistiken

- [ ] **3.C1** — Activity-Page initial: 30 Tage. Range auf "all" → lädt zurück bis zum ältesten Commit jedes Repos (gestreamed in Chunks bei Mega-Repos, mit Truncation-Banner bei >5_000 Commits). Range-Wechsel cached → kein Re-Fetch wenn Range im Cache. (→ Plan 3 §C.1)
- [ ] **3.C2** — DateRangePicker: zwei Date-Inputs + Preset-Chips (7d/30d/90d/1y/all). URL-Param `?since=…&until=…` reflektiert State. (→ Plan 3 §C.2)
- [ ] **3.C3** — Activity-Page Block "Insights" mit 6 Cards: Streak (current+longest), Trend, Top-Authors, Active-Day-of-Week, Avg-Commits/Week, Longest-Gap. Streak/Gap nutzen lokale Timezone. (→ Plan 3 §C.3)

### Settings

- [ ] **3.D1** — System-Settings → Terminal-Dropdown listet **nur installierte** Terminals (per `which`/`where.exe`/`mdfind`-Detection). Profile-Input erscheint nur bei kompatiblen IDs. Custom-Command mit `{path}` Placeholder. Auswahl wirkt sofort auf "Open in Terminal". (→ Plan 3 §D.1)
- [ ] **3.D2** — Provider-Token-Settings zeigt pro Provider Inline-Hilfe mit benötigten Scopes (GitHub/GitLab/Bitbucket je separat) + Link zur Token-Erstellungs-Seite. (→ Plan 3 §D.2)

### Quality

- [ ] **3.E1** — `yarn test --coverage` zeigt ≥60% Lines, ≥50% Branches App-weit. Jeder Slice (`reposSlice`, `prsSlice`, `providersSlice`, `settingsSlice`, `remoteImportSlice`, `activitySlice`) hat Reducer- und Thunk-Tests. Lib-Module (`activityStats`, `insights`, `notifications`, `charts/*`) ≥80% Lines. `cargo test` hat Happy+Failure-Cases pro Backend-Modul. (→ Plan 3 §E.1)

---

## Verifikations-Workflow

Empfohlene Reihenfolge beim Abhaken:

1. **Foundations zuerst** — F.1–F.4 müssen grün sein, sonst können andere Items strukturell nicht abgeschlossen werden.
2. **Bugs vor Features** innerhalb jedes Plans (Phase A → B → C → D → E).
3. **Cross-OS-Items (1.C\*, 2.A\*)** auf den jeweiligen Ziel-OS smoke-testen, nicht nur auf Dev-OS.
4. **Production-Build verifizieren** für Items, die Capabilities/Tauri-Plugin-Permissions berühren (2.A2, 2.C\*, 1.C\*).

Befehle:

```bash
yarn typecheck && yarn lint
yarn test --coverage
cargo test --manifest-path app/src-tauri/Cargo.toml
yarn test:e2e
```

Pro OS zusätzlich `yarn build` + Install-Smoke.
