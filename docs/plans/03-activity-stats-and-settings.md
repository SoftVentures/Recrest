# Plan 3 — Activity / Statistics / Dashboard & Settings & Quality

## Context

Konkretisierung der Items aus `docs/plans/future.md`, die Activity/Statistiken, Dashboard, Settings und Test-Suite betreffen. Diese Domäne hat keine echten Bugs in `future.md` (Author-Dedup wurde Plan 1 zugeordnet), daher startet der Plan mit Polish-Items für Charts und geht dann zu Features (volle History, Custom-Range, Insights, Settings-Erweiterungen, Test-Coverage).

Settings-Erweiterung "Terminal + Profil" hier, weil sie zur Settings-Domäne gehört — sie löst gleichzeitig Plan 2 A.1.

---

## Phase A — Bugs

Keine spezifischen Bugs in dieser Domäne in `docs/plans/future.md`. Der Author-Dedup-Bug ist in Plan 1 A.4, weil er überall greift, nicht nur in Stats.

---

## Phase B — Polish (Charts)

### B.1 MR-Velocity gerundeter Graph

- **Symptom:** "activity mr-velo - gerundeted graph."
- **Betroffene Dateien:** `app/src/components/organisms/activity/cards/PrVelocityCard/index.tsx:11-22`.
- **Aktueller Stand (verifiziert):** Die Funktion heißt zwar `polyline()`, **rendert aber bereits ein `<path d="…">`** mit `M`/`L`-Befehlen (gerade Segmente). Es muss also nicht von `<polyline>` zu `<path>` migriert werden — nur die `d`-String-Generation auf Splines umgestellt werden.
- **Vorgehen:**
  1. Neue Util `app/src/lib/charts/smoothLine.ts`:
     - Catmull-Rom-Spline → kubische Bezier-Path-Befehle.
     - Signatur: `smoothPath(points: [number, number][], tension = 0.5): string` (gibt `"M x0 y0 C ..."`).
     - Edge-Cases: 0 Punkte → `""`, 1 Punkt → `"M x y"`, 2 Punkte → `"M ... L ..."` (Spline braucht ≥3 Punkte für sinnvolle Kurve).
  2. `PrVelocityCard`:
     - Bestehenden `M/L`-String-Builder ersetzen durch `smoothPath(points)`.
     - Area-Variante (gefüllt): zweites `<path>` mit Close-to-Baseline (`L x_max baseline L x_min baseline Z`).
  3. **Palette-Konsistenz mit Plan 1 §B.3:** `smoothLine.ts` und `palette.ts` leben unter `app/src/lib/charts/` (Plan 1 Phase 0.3 Umbrella).
- **Test:**
  - Unit für `smoothPath`: Tabellen-Test mit fixen Punkt-Arrays → Path-String-Snapshot. Edge-Cases: 0/1/2/3+ Punkte.
  - Visual-Snapshot der Card.

### B.2 Chart-Konsistenz (siehe Plan 1 B.3)

- **Status:** Plan 1 zentralisiert die Palette in `app/src/lib/charts/palette.ts`.
- **Pflege hier:** `PrVelocityCard` und alle Cards in `app/src/components/organisms/activity/cards/*` aus der Palette importieren — kein separater Plan-Item nötig, ist Teil von Plan 1 B.3.

---

## Phase C — Activity / Statistiken erweitern

### C.1 Volle History statt 14-Tage

- **Symptom:** "Es sollte nicht nur eine 14 Tage history sein, sondern viel mehr immer zeigen was lokal 'ab' geht. Viel mehr sollte es die ganze history geben mit echten Insights."
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/repos.rs` — `list_recent_commits(days)`, default 14.
  - `app/src/lib/activityStats.ts:3` — `ACTIVITY_DAYS = 14` (Konstante steht **am Anfang der Datei**, nicht Zeile 49).
  - `app/src/pages/DashboardPage.tsx:55` — hard-coded 14-Tage-Bar-Chart.
  - `app/src/pages/ActivityPage.tsx`.
  - `app/src/hooks/useRecentCommits.ts` — Datenfluss.
  - `app/src/store/index.ts` — Slice-Wire-up für **neuen Slice**.
- **Neuer Slice (`activitySlice`) — heute nicht vorhanden:** Die fünf existierenden Slices in `store/index.ts` sind `repos, prs, providers, settings, ui`. Ein neuer `activity`-Slice wird hinzugefügt:

  ```ts
  // app/src/store/slices/activitySlice.ts
  type RepoCommits = {
    rangeLoaded: { since: string; until: string } | null;
    commits: RecentCommit[];
    status: "idle" | "loading" | "error";
  };
  type ActivityState = {
    commitsByRepo: Record<RepoId, RepoCommits>;
    selectedRange: { since: string; until: string };
  };
  ```

  Wire-up in `store/index.ts:reducer`. Persistenz: nur `selectedRange` in `persistenceMiddleware` mirrorn (Commits sind groß und re-fetchbar).

- **Vorgehen:**
  1. **Backend:** Parameter umbauen zu Range — `list_commits(repoIds, since: DateTime, until: DateTime, max_commits_per_repo: usize) → CommitsByRepoDto`. ISO-Strings für since/until.
     - **Hard cap `max_commits_per_repo = 5_000`** (Default; UI kann erhöhen). Bei Überschreitung: `CommitsByRepoDto.truncated[repoId] = true` Flag, UI zeigt Banner "Zeitraum gekürzt — Range verkleinern für vollständige Daten".
     - **Streaming für Mega-Repos:** wenn ein Repo ≥5_000 Commits liefert, in 1_000-er Chunks via Tauri-Event `activity://commits-chunk` streamen statt alles in einem Response. Frontend appended chunks an State.
  2. **Default-Lazy:** ActivityPage lädt initial Range = letzte 30 Tage. Range-Erweiterung (User scrollt oder klickt Preset `90d`/`1y`/`all`) löst `fetchCommitsRange(newSince, newUntil)`.
  3. **Range-Merging-Algorithmus (Slice-Reducer):**
     - State hat `rangeLoaded: { since, until }` pro Repo.
     - Neue Range `[s', u']` kommt rein:
       - Wenn `rangeLoaded` null: setze `[s', u']`, ersetze commits.
       - Wenn `[s', u']` Subset von `rangeLoaded`: no-op.
       - Wenn `[s', u']` überlappt mit `rangeLoaded`: nur den fehlenden Bereich nachladen (`[s', rangeLoaded.since)` und/oder `(rangeLoaded.until, u']`), Commits mergen via `commitId`-Set, `rangeLoaded = [min(s, rangeLoaded.since), max(u, rangeLoaded.until)]`.
       - Wenn disjunkt: setze `[s', u']`, ersetze commits (Single-Range pro Repo, kein Set-of-Ranges).
  4. **Memoization:** `reselect` als Dep ergänzen (`yarn add reselect` im `app`-workspace). Aggregations (`computeLeaderboard`, Heatmap, alle in §C.3) als `createSelector(...)`.
- **Test:**
  - Rust-Unit für Range-Filter (Tmp-Repo mit 10 Commits über 6 Monate, Range 30d nimmt 5).
  - Rust-Unit für Streaming-Chunks (Tmp-Repo mit 6_000 Commits → 6 Events).
  - Slice-Test für Range-Merging mit allen 4 Cases (subset/overlap-left/overlap-right/disjoint).
  - E2E: Range-Picker → Daten kommen, truncation-Banner erscheint bei großem Repo.

### C.2 Custom Timerange-Picker

- **Symptom:** "activity custom timerang option."
- **Neue Dateien:** `app/src/components/atoms/DateRangePicker/index.tsx`.
- **Betroffene Dateien:** `app/src/pages/ActivityPage.tsx:200-282`.
- **Vorgehen:**
  1. Atom: zwei Date-Inputs + Preset-Chips (`7d`, `30d`, `90d`, `1y`, `all`). `all` = oldest commit timestamp ermittelt vom Backend (`get_oldest_commit_date(repoIds)` Command).
  2. Range im URL-Param (`?since=…&until=…`) + `uiSlice.activityRange`.
  3. Anwenden auf Activity-Page (alle Cards), Dashboard (relevante Cards).
  4. i18n-Strings in `common.json` (`activity.range.preset_7d` etc.).
- **Test:** Component-Test mit URL-Sync.

### C.3 Echte Insights (Trends, Streaks, Top-Aggregations)

- **Symptom:** "echte Insights."
- **Betroffene Dateien:**
  - `app/src/lib/insights.ts` (neu).
  - `app/src/lib/activityStats.ts` — vorhandene Aggregations bleiben.
  - `app/src/components/organisms/activity/cards/insights/*` (neuer Ordner).
- **Timezone-Konvention (kritisch für Streaks/Gaps):** Alle Day-Buckets werden in **lokaler Timezone des Users** berechnet (nicht UTC). Begründung: Streak-Definition "ich committe jeden Tag" matcht den Lebensrhythmus. Implementation: `DateTime` zu Local konvertieren (`new Date(commit.timestamp).toLocaleDateString('en-CA')` für `YYYY-MM-DD`-Key) **vor** Bucketing. Alle Insight-Funktionen dokumentieren das in JSDoc.
- **Vorgehen:**
  1. Pure-Function-Modul `app/src/lib/insights.ts` mit folgenden Signaturen + Definitionen:
     - `computeStreaks(commits, today: Date) → { current, longest, longestRange: { start, end } }`.
       - "Streak" = Anzahl konsekutiver Local-Days mit ≥1 Commit. `current` läuft bis heute (inkl.); bricht bei einem Tag ohne Commit.
     - `computeTrend(commits, periodDays) → { direction: 'up'|'down'|'flat', deltaPct }`.
       - Vergleich: Commits in `[today - periodDays, today]` vs `[today - 2*periodDays, today - periodDays]`. `flat` bei `|deltaPct| < 5%`.
     - `computeTopAuthorsByPeriod(commits, periodDays, limit) → Author[]`.
     - `computeMostActiveDayOfWeek(commits) → { day: 0..6, count }` (Lokale Wochentag-Indizierung).
     - `computeAvgCommitsPerWeek(commits) → number`.
     - `computeLongestGap(commits) → { startDate, endDate, days }`.
       - "Gap" = max. Anzahl konsekutiver Local-Days **ohne** Commit zwischen erstem und letztem Commit. `days` = `endDate - startDate` (inklusive beider Enden, zero-based: Gap "kein Commit am 15. + 16." = `days: 2`).
  2. Eine Insight-Card pro Funktion (kompakt, ein KPI + Beschriftung + ggf. Mini-Chart).
  3. ActivityPage neuer Block "Insights" (Grid 3×2).
- **Test:**
  - Unit-Test pro Insight-Funktion mit fixen Commit-Arrays in deterministischer Timezone (`vi.setSystemTime` + `process.env.TZ = 'Europe/Berlin'` im Test-Setup).
  - Edge-Cases: leerer commit-Array, ein Commit, Commits am Tag-Wechsel UTC→Local.

---

## Phase D — Settings (Features)

### D.1 Terminal + Profil-Auswahl

- **Symptom:** "Im system punkt in general soll man auch das richtige terminal und terminalprofil auswählen können."
- **Betroffene Dateien:**
  - `app/src/components/organisms/settings/tabs/SystemSettings/index.tsx:26-56`.
  - `app/src-tauri/src/commands/terminal.rs` (siehe Plan 2 §A.1).
  - `shared/src/types/settings.ts`.
- **Vorgehen:**
  1. **Schema (siehe auch Plan 1 Phase 0.1):** `AppSettings.terminal: TerminalSettings` mit:

     ```rust
     #[derive(Default, Serialize, Deserialize)]
     #[serde(default, rename_all = "camelCase")]
     pub struct TerminalSettings {
         pub id: TerminalId, // default: TerminalId::Auto
         pub profile: Option<String>,
         pub custom_command: Option<String>,
     }
     // TerminalId = Auto | SystemDefault | Iterm | Warp | Kitty | Alacritty
     //            | Wezterm | Foot | GnomeTerminal | Konsole | Wt
     //            | Pwsh | Powershell | Cmd | Custom
     ```

  2. **Detection-Command** `detect_terminals() → Vec<TerminalInfo>` mit OS-spezifischen Methoden:
     - **macOS:** `mdfind "kMDItemContentType == 'com.apple.application-bundle'"` filtern auf bekannte Bundle-IDs (`com.apple.Terminal`, `com.googlecode.iterm2`, `dev.warp.Warp-Stable`, `net.kovidgoyal.kitty`, `org.alacritty`, `com.github.wez.wezterm`). Fallback: `command_exists` via `which` für CLI-Versionen.
     - **Linux:** `which`-Check für jede TerminalId (`kitty`, `foot`, `alacritty`, `wezterm`, `gnome-terminal`, `konsole`).
     - **Windows:**
       - **Kein `which`** — `where.exe <name>` (cross-platform: `std::process::Command::new("where").arg("wt.exe")`).
       - Registry-Lookup für Windows Terminal: `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\` enumerieren auf `DisplayName = "Windows Terminal"`.
       - PowerShell 7 (pwsh.exe) ist separat installiert: `where.exe pwsh.exe`.
       - cmd.exe immer vorhanden (`%SystemRoot%\System32\cmd.exe`).
  3. **UI:**
     - Dropdown mit detected Terminals (`auto` immer erste Wahl).
     - Profile-Input (nur sichtbar für Terminals mit `--profile`-Support: gnome-terminal, kitty `--session`, wezterm `--config`, wt `-p`).
     - Custom-Command (Textfield, `{path}` Placeholder) für `id: Custom`.
  4. **Verbindung zu Plan 2 §A.1:** `terminal.rs::open_at(path)` liest `AppSettings.terminal` und dispatcht zu Handler. Für `id: Auto` greift Detection-Order: System-Default → erstes installiertes vom Wunschliste.

- **Test:**
  - Rust-Unit für `detect_terminals` pro OS — Mock `Command::output` (mockable via `which` crate oder Trait-Abstraction); Tabelle: 0 installiert / 1 installiert / alle installiert.
  - Component-Test für Settings-UI (Profil-Input erscheint nur bei richtigen IDs).
  - Manuell pro OS: Toggle Terminal → "Open in terminal" auf RepoRow → korrektes Terminal startet.

### D.2 Git-Token-Description (Scopes/Settings)

- **Symptom:** "bei git token description - welche settungs."
- **Betroffene Dateien:**
  - `app/src/components/organisms/settings/ProviderAuth/index.tsx:36-100`.
  - `app/src/i18n/locales/{en,de}/settings.json`.
- **Vorgehen:**
  1. Pro Provider Inline-Hilfe-Block:
     - **GitHub:** Scopes `repo, read:user, read:org`. Link zu `https://github.com/settings/tokens/new`.
     - **GitLab:** Scopes `api, read_user, read_repository, read_api`. Link zu `<base>/-/profile/personal_access_tokens`.
     - **Bitbucket:** App-Password mit Permissions `Account: Read, Workspace: Read, Repositories: Read, Pull requests: Read+Write`. Link zu `https://bitbucket.org/account/settings/app-passwords/new`.
  2. Komponente `<TokenScopesHint provider={id} />` rendert Bullets + Link.
  3. i18n-Keys `providers.<id>.tokenScopes.intro` + `.bullet1..N` + `.cta`.
- **Test:** Component-Test mit Provider-Switch.

---

## Phase E — Quality / Test-Suite

### E.1 Test-Coverage signifikant ausbauen

- **Symptom:** "Wir müssen die Test suite erhöhen um alle solche dinge direkt auszubessern."
- **Aktueller Stand (Recon):**
  - **Vitest gesamt:** 124 Files (~100 App, ~15 Shared, ~5 Landing).
  - **Tests pro Slice:** `uiSlice.test.ts` ✓, `activityAggregates.test.ts` ✓.
  - **Ungetestete Slices:** `reposSlice`, `prsSlice`, `providersSlice`, `settingsSlice`, `remoteImportSlice`.
  - **E2E:** 32 Specs in `tests/src/e2e/` (überwiegend Landing).
- **Vorgehen:**
  1. **Slices** — pro Slice: Reducer-Test (sync) + Thunk-Test (mit gemocktem `invoke`):
     - `app/src/store/slices/reposSlice.test.ts`.
     - `prsSlice.test.ts`.
     - `providersSlice.test.ts` (inkl. Token set/clear-Reducer).
     - `settingsSlice.test.ts`.
     - `remoteImportSlice.test.ts`.
  2. **Lib-Functions** — Tests für jede pure Function in `lib/` ohne Test (Sweep mit `rg "export (function|const)" app/src/lib | grep -v "test\.ts"`).
  3. **Rust-Backend:**
     - Provider-Tests mit `mockito`/`wiremock` pro Provider (`github::tests`, `gitlab::tests`, `bitbucket::tests`).
     - `git/scanner`, `git/status`, `git/logo`, `git/author_normalize` (Plan 1 A.4) — Tmp-Repo-Tests.
     - `auth/token` — keyring-Mock oder feature-gated.
  4. **E2E (Playwright)** — Critical Paths:
     - Onboarding-Flow (existiert evtl., review).
     - Repo-Add → Status erscheint.
     - PR-View → Drawer öffnet → Details.
     - Settings-Token setzen → Provider verbunden.
     - Notifications bei CI-Fail (mocked Provider).
- **Coverage-Ziele (mehrdimensional, nicht nur lines):**
  - **App-weit (Vitest):**
    - 60% Lines (Floor — leicht, aber Pflicht).
    - 50% Branches (verhindert Mount-only-Tests die Lines pumpen).
  - **Pro Slice (`reposSlice`, `prsSlice`, `providersSlice`, `settingsSlice`, `remoteImportSlice`, neuer `activitySlice`):** mindestens ein Reducer-Test pro Action + ein Thunk-Test pro Async-Thunk.
  - **Pro Lib-Modul** (`activityStats`, `insights`, `notifications`, `charts/palette`, `charts/smoothLine`, `git/author_normalize` Frontend-Side): 80% Lines.
  - **Rust-Backend (`cargo test`):**
    - `git/scanner`, `git/status`, `git/logo`, `git/author_normalize`, `commands/git_index`, `commands/git_config`, `auth/token`, `providers/github|gitlab|bitbucket`: jeweils mindestens Happy-Path + 2 Failure-Cases.
- **Tooling:**
  - `yarn test --coverage` einrichten (Vitest-Config in `app/vitest.config.ts` + `coverage.thresholds.{lines: 60, branches: 50}`).
  - Per-Datei-Threshold via `coverage.perFile = false` (Aggregat) — ggf. später per-File einführen wenn der Floor stabil hält.
  - CI-Job-Ergänzung: Coverage-Report als Artifact + Diff-Bot Kommentar bei PR.
- **Test:** Self-test — `yarn test --coverage` failed bei <60% Lines / <50% Branches.

---

## Phase-übergreifende Verifikation

```bash
yarn typecheck && yarn lint
yarn test --coverage
cargo test --manifest-path app/src-tauri/Cargo.toml
yarn test:e2e
```

Manuelle Smokes:

- C.1/C.2: Range-Picker mit `all` lädt Repo-volle History ohne UI-Hang.
- C.3: Insight-Cards zeigen plausible Werte (Streak vs. tatsächlicher git log).
- D.1: pro OS Default-Terminal wechselt und "Open in terminal" reagiert.
- D.2: Token-Hint zeigt richtige Scopes je Provider.
- E.1: `yarn test --coverage` bestätigt ≥60% Lines.
