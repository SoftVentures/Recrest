# Akzeptanz-Checkliste

Jedes Item aus `docs/plans/future.md` als überprüfbarer Checkbox. Hak ab, sobald du das beobachtbare Verhalten verifiziert hast (nicht sobald der Code gemerged ist — Akzeptanz-Kriterium ist immer "User-sichtbar funktioniert").

Spalten-Konvention pro Item: `- [ ] <ID> — <Akzeptanz-Kriterium> (→ Plan N §X.Y)`.

---

## Foundations (Cross-Plan)

- [x] **F.1** — `app/src-tauri/src/config/settings.rs` hat alle 11 neuen Felder mit `#[serde(default)]`; Migrations-Test lädt eine alte `settings.json`-Fixture ohne neue Felder ohne Error. (→ Plan 1 §0.1)
- [x] **F.2** — Neues Drawer-Primitive `app/src/components/molecules/Drawer/index.tsx` existiert und exportiert die Phase-0.2-Prop-Surface. (→ Plan 1 §0.2)
- [x] **F.3** — `app/src/lib/charts/palette.ts` existiert; `ACTIVITY_PALETTE` ist daraus migriert; alle Activity-Cards importieren von dort. Kein `ACTIVITY_PALETTE`-Vorkommen mehr in `activityStats.ts`. (→ Plan 1 §0.3)
- [x] **F.4** — `lib/tauri.ts` taucht in keinem Plan-Edit als Pfad mehr auf — nur `lib/tauri/index.ts`. `r#trait.rs` taucht als Datei-Pfad nirgends mehr auf. (→ Plan 1 §0.5)

---

## Plan 1 — Bugs & UI Polish

### Plattformübergreifende Bugs

- [x] **1.A1** — In MR-View und Repo-Detail-View ist der Drawer optisch identisch (`size="lg"` 440px overlay in beiden). ESC + Click-Outside (Backdrop) schließen in beiden. **Smoke-Test verifiziert.** (→ Plan 1 §A.1)
- [x] **1.A2** — PR auf GitHub erstellen ohne Self-Assignment → keine OS-Notification. PR sich selbst zuweisen → Notification kommt. PR-Liste in der UI zeigt **alle** PRs unabhängig vom Assignee. Cold-Start ohne geladene Identity → keine falschen Notifications. (→ Plan 1 §A.2)
- [x] **1.A3** — Activity → Review-Queue mit absichtlich überlangem Repo-Namen: Label endet mit `…`, kein horizontaler Overflow. Stichprobe in 3 weiteren Cards bestätigt selbes Verhalten. (→ Plan 1 §A.3)
- [x] **1.A4** — Repo mit Commits unter "Müller <ü@x>" und "Mueller <ue@x>" → Leaderboard zeigt **eine** Zeile. `deunicode = "1"` in `Cargo.toml`, Pipeline German→Diaspora→deunicode→lowercase. 13 Rust-Tests + CJK-Homograph-Tiebreak via SipHash. (→ Plan 1 §A.4)
- [x] **1.A5** — Repo pinnen → erscheint in eigener Sektion oben über allen Folder-Gruppen. App neu starten → Pin bleibt persistent. (→ Plan 1 §A.5)
- [x] **1.A6** — Failing CI auf GitHub-Repo zeigt "Checks failed", auf GitLab/Bitbucket "Pipelines failed", Default "CI failed". Per-Provider-Keys in `notifications.ci_failed.{github,gitlab,bitbucket,default}.{title,body}` + `chip_checks_failed.{provider}.{one,other}` (en + de). Auflösung in `useNotificationTriggers.ts` via `pr.providerId`. (→ Plan 1 §A.6)
- [x] **1.A7** — In Repo-Detail-View auf eine offene PR klicken → Drawer öffnet inline (geteilter `MergeRequestDetailPanel`); URL bleibt auf Repo-Detail. (`RepoDetailPage.tsx:442` ersetzt `navigate(MERGE_REQUESTS)` durch `setSelectedPrId`-State + Drawer.) (→ Plan 1 §A.7)

### UI / Visuelle Bugs

- [x] **1.B1** — Dashboard "Languages"-Card: Donut nimmt deutlich mehr Höhe als vorher, Legende liegt darunter (nicht daneben). Bei Card-Breite ≤280px wird Legende zu Single-Column. (→ Plan 1 §B.1)
- [x] **1.B2** — 24 Repo-Default-Avatare nebeneinander zeigen kein einheitliches "alle hellen Pixel oben links" mehr — Gradient-Richtung variiert deterministisch. (→ Plan 1 §B.2)
- [x] **1.B3** — Repo X hat dieselbe Farbe in Donut, Bar, Line, Area, Heatmap. Hover-Faded-Variante folgt einheitlicher HSL-Funktion. (→ Plan 1 §B.3)

### macOS

- [x] **1.C1** — App per X schließen → ist im Tray, nicht im Dock. cmd+Space → "Recrest" → Enter → Fenster erscheint im Vordergrund. (→ Plan 1 §C.1)

### Windows

- [ ] **1.C2** — Hover über Maximize-Button (rechts oben) → Windows-Snap-Layouts-Flyout erscheint. Hover über Minimize/Close → OS-Tooltip in System-Sprache (kein Doppel-Tooltip). (→ Plan 1 §C.2)
- [ ] **1.C3** — Settings → "Start with system" ON → Reboot → App startet im Tray. Registry-Eintrag unter `HKCU:\…\Run` zeigt korrekten installierten EXE-Pfad. Plus: Toggle "Start minimized" persistiert nur, minimiert NICHT live (Frontend-Hook `useStartMinimized` entfernt — Rust setup-hook `lib.rs:230/283` ist Single-Source-of-Truth). `tauri_plugin_autostart::init` mit `Some(vec!["--start-minimized"])`-Arg, Errors in `autostartService.ts` werden geworfen + Toast. (→ Plan 1 §C.3) — **Code DONE, Reboot-Smoke-Test manuell auf Windows nötig.**
- [x] **1.C4** — Settings → "Start minimized" + "Close to tray" → App startet ohne Taskbar-Eintrag, nur im Tray. Kombinations-Matrix dokumentiert + erwartbares Verhalten konsistent. (→ Plan 1 §C.4)

### Linux

- [ ] **1.C5** — Auf Wayland-Session (Hyprland/GNOME-Wayland): App rendert nativ, `xeyes` zeigt sie nicht (kein XWayland). Auf X11-Session: App startet trotzdem (Fallback greift). (→ Plan 1 §C.5)
- [ ] **1.C6** — Auf 4K-Display (Arch + Hyprland): UI in nativer Größe, keine doppelte Skalierung. Mehrere Monitore mit unterschiedlicher Skala: korrekte Größe pro Monitor. (→ Plan 1 §C.6) — **PARTIAL:** Wayland fractional scaling delivers correct nativ scaling automatically (kein Eingriff nötig). Force-HiDPI-Toggle für X11-only zurückgestellt — bei Bedarf separat implementieren.
- [ ] **1.C7** — dunst auf Arch zeigt Recrest-Logo bei jeder Notification. Plasma/KDE und GNOME-Shell ebenfalls. (→ Plan 1 §C.7)

### Allgemeine UX-Verbesserungen

- [x] **1.D1** — RepoList unter ~720px Container-Breite wechselt automatisch zur Card-Ansicht (one-way `grouped→card`-Override; explizite `flat`/`card` werden respektiert). View-Toggle (Grouped/Flat/Card) im Page-Header, Wahl persistiert via `repoListViewMode`. **Smoke-Test verifiziert.** (→ Plan 1 §D.1)
- [x] **1.D2** — Branch-View hat: ausklappbare Sektionen (Local/Remote/Stale/…), Such-Input, Status-Filter. (→ Plan 1 §D.2)
- [x] **1.D3** — Click auf "Repo entfernen" / "Force Push" / "Discard Changes" / "Token-Reset" zeigt Confirmation-Dialog. Setting "Confirm risky actions" steuert das. (→ Plan 1 §D.3)
- [x] **1.D4** — Onboarding-Wizard: konsistenter "Zurück"-Button im Footer aller Steps (außer Step 0). Form-Eingaben bleiben beim Zurück erhalten. (→ Plan 1 §D.4)
- [ ] **1.D5** — Drawer schließt per Swipe nach rechts. Page-Switch per horizontalem Swipe. Mindestens 2 Use-Cases dokumentiert + getestet. (→ Plan 1 §D.5)
- [x] **1.D6** — Cmd/Ctrl + `+` / `-` / `0` skaliert UI live. Slider in System-Settings reflektiert dieselbe Skala (bidirektional gesynct). Skala persistiert. (→ Plan 1 §D.6)
- [x] **1.D7** — Activity-Page scrollen, weg navigieren, zurück → Scroll-Position wiederhergestellt. Selbes für Repo-List, MR-List. (→ Plan 1 §D.7)

---

## Plan 2 — Repo Management & Git Actions

### Bugs (Repo-Aktionen kaputt)

- [x] **2.A1** — "Open in Terminal" funktioniert auf macOS (Terminal+iTerm+Warp), Linux (kitty/foot/wezterm/alacritty/gnome-terminal/konsole), Windows (wt/pwsh/powershell/cmd) je nach gewähltem Terminal in Plan 3 §D.1. Pfade mit Spaces/Sonderzeichen funktionieren. (→ Plan 2 §A.1)
- [x] **2.A2** — "Open in Folder" markiert das Repo-Verzeichnis im Datei-Explorer (Finder zeigt es selektiert auf macOS, Explorer markiert auf Windows, xdg-open öffnet auf Linux). In Production-Build (nicht nur Dev) funktioniert es. (→ Plan 2 §A.2)

### Repo-Verwaltung (Polish)

- [ ] **2.B1** — Repo-Import-Wizard hat Felder vorausgefüllt aus `repoImportDefaults` (Provider, Scan-Path, Group). Checkbox "Als Default speichern" funktioniert. (→ Plan 2 §B.1)
- [ ] **2.B2** — Settings → Storage zeigt Radio "Default" neben jedem Scan-Path. Wahl wird beim Repo-Import übernommen. (→ Plan 2 §B.2)
- [ ] **2.B3** — Repo ohne lokales Logo + ohne Brand-Match: zeigt Favicon des Origin-Hosts (falls Setting `privacy.fetchFavicons = true`). PNG-Bombe im Test-Server wird abgelehnt. SVG mit `<script>` wird abgelehnt. Self-signed Cert nur mit explizitem Allow. (→ Plan 2 §B.3)
- [ ] **2.B4** — Click auf Pin-Icon im RepoRow toggelt Pin (vorher nur per Dropdown möglich). Tooltip ändert sich. (→ Plan 2 §B.4)
- [x] **2.B5** — RepoList-Toggle "Grouped/Flat" verfügbar. Im Flat-Mode: sortierbarer Header (Name/Branch/Status/Activity), Klick toggelt Asc/Desc. Sort-State persistiert. Pinned bleibt oben. (→ Plan 2 §B.5)
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

## Phase 1 Bugs (aus `docs/plans/bugs.md`)

### Onboarding-Wizard

- [x] **W.1** — Design-Dropdown im Wizard: Breite reicht für längste Locale-Übersetzung der Theme-Optionen. (`BasicsStep/index.tsx`: `sm:min-w-56` + content `min-w-[14rem]`)
- [x] **W.2** — Language-Dropdown zeigt Flag-Icon vor jedem Sprach-Eintrag. (Emoji-Prefix 🇬🇧 / 🇩🇪 in `BasicsStep/index.tsx`)
- [x] **W.3** — Im Git-Host-Tab: Wenn ≥1 Provider verbunden ist, flippt CTA von "Continue without connection" zu "Continue". (`ConnectProviderStep/index.tsx` via `providers.connections[*].connected`)
- [x] **W.4** — Provider-Tabs im Git-Host-Tab zeigen GitHub/GitLab/Bitbucket-Brand-Icons. (`ConnectProviderStep/index.tsx` rendert `BrandIcon`)
- [x] **W.5** — Im "Search in folder"-Tab pulsiert das Search-Icon statt Skeleton-Box. (`InitialScanStep/index.tsx` — `motion-safe:animate-pulse`)
- [x] **W.6** — Letzter Wizard-Tab hat Zurück-Button im Footer. (`DoneStep/index.tsx` akzeptiert `onBack`; `OnboardingWizard/index.tsx` reicht `goBack` durch — History-Stack StrictMode-safe via Ref)

### Logo-Recognition

- [x] **L.1** — Repo ohne Brand-Match probiert Origin-Host-Favicon (`/favicon.ico`, `/apple-touch-icon.png`, `/favicon.png`) bevor Default-Avatar; gated durch `settings.privacy.fetchFavicons`; 2MB-Cap, SVG-mit-`<script>`-Reject, in-memory-LRU mit 200-Slot-Cap. (`useRepoFavicon.ts`, `RepoAvatar/index.tsx`)
- [x] **L.2** — Repo mit lokalem Logo (`logo.{png,svg,jpg}` / `icon.{png,svg}` in Repo-Root + `assets/` + `docs/`) wird vor Favicon-Probe angezeigt. (`git/logo.rs::detect_repo_logo`, eingebunden in `RepoDto::from_record`, frontend `useRepoLogo`)

### Developer-Settings

- [x] **DEV.1** — In den Settings → Developer-Tab gibt es einen Button "Reset to factory defaults" (mit Confirmation-Dialog). Click löscht: `settings.json`, Keychain-Tokens (alle Provider), `localStorage`-Mirror, `sessionStorage`-Scroll-Memory. Danach startet der Onboarding-Wizard automatisch (wie beim ersten Start). **Smoke-Test verifiziert: Button im Developer-Tab unter "Reset to factory defaults" sichtbar mit Beschreibung "Wipes every setting, all stored provider tokens, and any cached UI state".**

---

## Phase 2 Bugs (zweite Runde aus `docs/plans/bugs.md`)

### General

- [x] **G.1** — Reload-Button (Topbar) zeigt Success-Toast nach erfolgreichem Reload, Error-Toast bei Fail. (`Header/index.tsx::onRefresh` await `dispatch(loadRepos()).unwrap()` + sonner toast)
- [x] **G.2** — Repo-Add-Flow: ButtonGroup "Lokal" / "Global" sichtbar mit Icons (`Monitor`/`Globe`), default "Lokal", icon-only + Tooltip unter 961px. (Funktionalität für später; UI vorbereitet.)

### Dashboard

- [x] **DA.1** — Skeleton-Loader rendert 6 Slots (vs. 7 mit Provider) — matcht Loaded-Grid. (`DashboardPage.tsx`)
- [x] **DA.2** — Activity-Card Tooltip mit `sideOffset={8}` an `.a-dash-bar` (statt full-height col-wrapper). 8px über Graph-Endpunkt. (`DashboardPage.tsx`)
- [x] **DA.3** — "Braucht deine Aufmerksamkeit"-Counter (`Math.min(.length, slice-cap)`) == Anzahl gerenderter Rows. **Smoke-Test verifiziert: "5 items" Counter + 5 Rows.**
- [x] **DA.4** — Open-MR-Card: `<CiDot state={null}>` bei `running`/`pending`. **Smoke-Test verifiziert: kein Pulsing in MR-Card mehr.**
- [x] **DA.5** — Schnellaktionen-Block mit 4 Aktionen: Open-IDE / Recent-Commits / Create-Branch / Pull-All (last as "coming soon"). **Smoke-Test verifiziert: 4 Buttons sichtbar.**

### Repositories

- [x] **R.1** — Click auf View-Toggle (Grouped/Flat/Card) wechselt Layout sofort + persistiert. ResizeObserver-Auto-Override jetzt strikt one-way `grouped→card` für narrow viewport — explizite `flat`/`card` werden immer respektiert. **Smoke-Test verifiziert: Toggle aktiv, Card-Mode wechselt.**
- [x] **R.2** — Filter-Bar in ReposPage: Status-Chips (Dirty/Clean/Ahead/Behind) + Sort-Dropdown (Default/Name asc/desc/Last modified/Status), persistiert via `repoListSort`. **Smoke-Test verifiziert: Toolbar sichtbar.**

### Merge Requests

- [x] **MR.1** — MR-Page nutzt volle Viewport-Höhe via `.a-mr` flex-column + `padding-bottom: 60px`. **Smoke-Test verifiziert.**
- [x] **MR.2** — MR-Drawer (Liste-Page) optisch identisch mit Repo-Detail-Drawer: `size="lg"` (440px overlay, kein `a-drawer-inline` mehr). **Smoke-Test verifiziert: beide Drawer pixel-konsistent.**
- [x] **MR.3** — MR-Page-Layout konsistent: Filter-Toolbar oben + List-Card unten (gleicher Pattern wie Branches/Repos). **Smoke-Test verifiziert.**

### Changes

- [x] **CH.1** — Click auf View-Toggle in Changes wechselt Layout sofort. (Selbe Komponente wie R.1 — Fix deckt mit ab.)

### Branches

- [x] **BR.1** — Branch-View-Sektionen kollabierbar via `<div role="button">` (a11y-konform, kein nested-button-in-summary), Fold-State persistiert in `sessionStorage["recrest:branches:fold:<repoId>"]`. **Smoke-Test verifiziert: Chevron-Toggles pro Repo-Gruppe.**

### Activity

- [x] **AC.1** — Open-MRs-Card hat keinen Balken mehr — nur Text-Subline `3 in Review · 2 Entwurf`. **Smoke-Test verifiziert.**
- [x] **AC.2** — CI-Health-Card zeigt Multi-Color-Verteilung (stacked donut: passed/failed/other) + Legende. **Smoke-Test verifiziert: 437 grün / 7 rot, 98%.**
- [x] **AC.3** — Commit-Aktivität-Card mit `flex: 1 1 auto; min-height: 140px` (statt fixed 110px). **Smoke-Test verifiziert: Bars rendern korrekt neben LanguageDonut.**
- [x] **AC.4** — `app/src/lib/charts/smoothLine.ts` (Fritsch-Carlson monotone cubic) + 6 Tests. Anwendung in `PrVelocityCard` + `CiPassRateCard`. **Smoke-Test verifiziert: Smooth Curves sichtbar.**
- [x] **AC.5** — `.a-act-rq-title` jetzt mit `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`; `.a-act-rq-body` mit `min-width: 0`. (`views.scss`)
- [x] **AC.6** — Author-Dropdown in `ActivityPage.tsx` baut Optionen aus `computeLeaderboard` (signatureKey-dedupliziert) statt raw `c.author`. `selectedAuthor` ist jetzt der `signatureKey`. (`LeaderboardCard` nutzte schon den Leaderboard.)

---

## Smoke-Test-Findings (während Browser-Verifikation entdeckt + gefixt)

Während des Playwright-Smoke-Tests via `yarn dev:web` aufgetaucht, nicht aus `bugs.md` aber inline gefixt:

- [x] **S.1** — `<SelectItem value="">` in `ReposPage.tsx` Sort-Dropdown crashte Page (Radix verbietet leeren String). Sentinel `""` → `"default"` umgestellt.
- [x] **S.2** — Dev-Stub `app/src/lib/dev/tauriStub.ts` für `yarn dev:web`: installiert `window.__TAURI_INTERNALS__` mit Seed-driven Routing, sodass Browser-Smoke-Tests realistische Daten zeigen ohne Tauri-Backend. Gated `import.meta.env.DEV && !isTauri` — production tree-shaked, E2E-Fixtures unaffected.
- [x] **S.3** — `unregisterListener` undefined Errors im Stub: Event-Plugin-Internals (`__TAURI_EVENT_PLUGIN_INTERNALS__`) ergänzt für Cleanup-Path.
- [x] **S.4** — Seed-Timestamps statisch (`2026-04-x`), fielen außerhalb 14-Tage-Window: jetzt `daysAgo(n)`-relativ.
- [x] **S.5** — Repo-Group-Header zeigte raw `groupId` ("OPEN-SOURCE") statt Display-Name ("Open Source"): `enrichRepo` mappt jetzt `groupId → groups[id].name`.
- [x] **S.6** — Avatar-Gravatar-404s für `@example.com`/`@renovateapp.com` Emails: skip Remote-Fetch, fall straight through zu Letter-Avatar.
- [x] **S.7** — Stagger-Animation `pgSlideL` zu lang (320ms+40ms-stagger): reduziert auf 200ms+20ms, Start-Opacity 0.4 statt 0.
- [x] **H.4** — Header-Responsive: `BookPlus`-Icon (statt `+`-Text-Prefix) für Add-Repo, icon-only unter 961px mit Tooltip; `Ctrl+K`-Hint hidden unter 1024px; Title-Counter hidden unter 721px; Search shrinkt mit `flex: 1 1 auto`. Plus Lokal/Global-ButtonGroup mit `Monitor`/`Globe`-Icons + responsive collapse.
- [x] **LN.1** — Settings-Icon in LeftNav unten links (war zwar in DOM aber Sidebar overflowed Viewport, weshalb es nicht sichtbar war).
- [x] **LN.2** — Sidebar-Höhe `max-height: 100vh` (nicht `100%` against overflowing parent). Root-Cause: `transform: scale(var(--ui-scale))` auf `#root` plus redundantes `#root { height: 100vh }` (überschrieb das vorhandene `calc(100vh / scale)`-Compensate).
- [x] **D.S1** — MR-Drawer-Cluster (5 Symptome, 1 Bug): `?? filtered[0]`-Fallback in `MergeRequestsPage` re-selected ersten PR bei `setSelectedId(null)` → Close ging nicht. Plus `.a-drawer { top: 32px }` ignorierte 52px Page-Header → neue CSS-Vars `--chrome-h` + `--header-h`. Plus Backdrop covered Titlebar-Drag-Region → `top: var(--header-h)`.
- [x] **C.4-FU** — Settings "Start minimized"-Toggle minimierte Window live: `useStartMinimized()`-Hook in `useTauri.ts` hatte `[startMinimized]`-Dep → bei Toggle feuerte `windowService.minimize()`. Hook komplett entfernt; Rust setup-hook in `lib.rs` ist Single-Source-of-Truth (Boot-Time-only).
- [x] **N2** — Crash beim Klick auf View-Toggle "Card" auf Repos-Seite: `TypeError: Cannot read properties of undefined (reading 'pinnedRepoIds')` in `uiSlice.ts`. Der `hydrate`-Reducer las `payload.pinnedRepoIds`, ohne zu prüfen ob `payload` selbst definiert ist. Im Tauri-Stub liefert `saveSettings.fulfilled` undefined zurück → Crash. Fix: `payload && Array.isArray(...)` guard.
- [x] **D1** — Repo Card-View Layout kollabierte auf schmalem Viewport zu chaotischem Content-Flow: `.repo-card-grid` definierte `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`, aber Cards sind eine Ebene tiefer im `.repo-card-group-items`-Container verschachtelt — nicht direkte Grid-Kinder. Fix: Outer Grid auf `1fr` (Gruppen-Spalte), Inner `.repo-card-group-items` ist jetzt der eigentliche `repeat(auto-fill, minmax(220px, 1fr))`-Grid.
- [x] **D2** — MR-Drawer Empty-States zeigten nur `—` (em-dash), las sich wie nicht-geladen statt "leer". Fix: i18n-Keys `mrs.drawer.reviewers_empty/files_empty/files_unavailable/timeline_empty/timeline_unavailable` (en + de) plus `.a-dp-empty`-CSS (italic, ink-3).
- [x] **D3** — Branches-Page hatte keine Such-Eingabe (laut Plan 1 §D.2 vorgesehen). Fix: `<input type="search">` in `.a-br-toolbar` vor den Filter-Chips, lokales `search`-State, Filter substring-matcht gegen `b.name` / `${remote}/${name}`. i18n-Keys `branches.search_placeholder` + `branches.search_aria`.

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
