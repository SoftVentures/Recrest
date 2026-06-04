# Plan 4 — Activity / Statistiken / Settings & Quality

> **Ausführbare Unterpläne in `docs/plans/04/`** (Stand 2026-06-03):
>
> 1. [`04/01-activity-data-and-charts.md`](04/01-activity-data-and-charts.md) — Phase C + Nivo-Chart-Migration (alle handgerollten SVG-Charts → `@nivo/*`, MIT).
> 2. [`04/02-settings-terminal-and-tokens.md`](04/02-settings-terminal-and-tokens.md) — Phase D.
> 3. [`04/03-quality-and-coverage.md`](04/03-quality-and-coverage.md) — Phase E (hängt an 04/01 für `activitySlice`-Tests; 04/02 ist unabhängig parallelisierbar).
>
> Bei Abweichungen zwischen diesem Dokument und den Unterplänen gelten die Unterpläne.

## Kontext

Konkretisierung der noch offenen Items aus `docs/plans/future.md` für Activity/Dashboard/Settings sowie der Test-Suite. Plan 1 hat die Chart-Palette zentralisiert (`app/src/lib/charts/palette.ts`), Plan 4 B.1 ist bereits in `app/src/lib/charts/smoothLine.ts` umgesetzt — beide Phase-B-Items sind **erledigt**, daher hier nicht mehr aufgeführt.

**Voraussetzung:** MUI-Migration (Plan 2) ist gemerged; alle Cards/Tabs/Inputs sind MUI v9 + Emotion `styled`.

**Stand nach Re-Audit (2026-06-03):**

- ✅ B.1 / B.2 (gerundeter PR-Velocity-Graph + zentrale Palette).
- ✅ Terminal/Shell-Auswahl-UI mit Dropdowns (`SystemSection`); Backend `TerminalSettings`-Struct + Spawn-Plans + Shell-Detection. `TerminalSettings.profile`/`.customCommand` existieren in TS **und** Rust; `open_at` nutzt `custom_command` bereits.
- ✅ Token-Scopes-Chips (`PROVIDER_OAUTH_SCOPES`) im `ProviderRow`.
- ✅ **D.2 Deep-Link zur Token-Erstell-Seite** ist implementiert (`PROVIDER_CREATE_TOKEN_URLS` in `shared/src/constants/providers.ts`, `tokenCreateUrlFor()` im `ProviderRow`) — offen ist nur Test-Absicherung (→ 04/02 Task 6).
- ❌ Range-fähiger Activity-Datenfluss + Insights (C.1–C.3); kein `activitySlice`, kein `insights.ts`, kein `DateRangePicker`.
- ❌ Echtes `detect_terminals`-IPC (UI nutzt hardcodierte Stub-Maps); `terminal_spawn_plan` **ignoriert** das `profile`-Argument (`terminal.rs`, `_profile`).
- ❌ Strukturierter Coverage-Floor + Vitest-Coverage-Setup; **keine** Reducer-Tests vorhanden (frühere Audit-Annahme `uiReducer.test.ts`/`reposReducer.test.ts` war falsch).
- 🆕 Chart-Design-Overhaul: alle handgerollten SVG-Charts migrieren auf **Nivo** (MIT; Entscheidung 2026-06-03 — MUI X Charts verworfen, weil Heatmap dort Pro-only ist) → 04/01.

---

## Phase C — Activity / Statistiken erweitern

### C.1 Volle History statt 14-Tage

- **Symptom:** "Es sollte nicht nur eine 14 Tage History sein, sondern viel mehr immer zeigen was lokal ab geht. Viel mehr sollte es die ganze History geben mit echten Insights."
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/repos.rs` — `list_recent_commits(days)` heute mit default 14.
  - `app/src/lib/activityStats.ts` — `ACTIVITY_DAYS = 14` (oben in der Datei).
  - `app/src/pages/app/Dashboard/index.tsx` + `parts/ActivityChart/index.tsx` — hardcoded 14-Tage-Chart.
  - `app/src/pages/app/Activity/index.tsx`.
  - `app/src/hooks/useRecentCommits.ts` — Datenfluss.
  - `app/src/store/index.ts` — neuer `activity`-Slice.
- **Neuer Slice (`activitySlice`):** Die fünf existierenden Slices in `store/index.ts` sind `repos, prs, providers, settings, ui`. Wird ergänzt:

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

  Wire-up in `store/index.ts:reducer`. Persistenz: nur `selectedRange` über `persistenceMiddleware` mirroren (Commits sind groß und re-fetchbar).

- **Vorgehen:**
  1. **Backend:** Umbauen zu Range — `list_commits(repoIds, since: DateTime, until: DateTime, max_commits_per_repo: usize) → CommitsByRepoDto`. ISO-Strings für since/until.
     - **Hard cap `max_commits_per_repo = 5_000`** (Default, UI darf erhöhen). Bei Überschreitung: `CommitsByRepoDto.truncated[repoId] = true`, UI zeigt Banner "Zeitraum gekürzt — Range verkleinern für vollständige Daten".
     - **Streaming für Mega-Repos:** wenn ein Repo ≥5_000 Commits liefert, in 1_000-Chunks via Tauri-Event `activity://commits-chunk` streamen statt One-Shot. Frontend appended Chunks an State.
  2. **Default-Lazy:** ActivityPage lädt initial Range = letzte 30 Tage. Range-Erweiterung (User scrollt oder klickt Preset `90d`/`1y`/`all`) löst `fetchCommitsRange(newSince, newUntil)`.
  3. **Range-Merging-Algorithmus (Slice-Reducer):**
     - State hat `rangeLoaded: { since, until }` pro Repo.
     - Neue Range `[s', u']` rein:
       - `rangeLoaded` null → setze `[s', u']`, ersetze commits.
       - `[s', u']` Subset → no-op.
       - Überlapp → nur fehlenden Bereich nachladen (`[s', rangeLoaded.since)` und/oder `(rangeLoaded.until, u']`), Commits mergen via `commitId`-Set, `rangeLoaded = [min(s, rangeLoaded.since), max(u, rangeLoaded.until)]`.
       - Disjunkt → setze `[s', u']`, ersetze commits (Single-Range pro Repo).
  4. **Memoization:** `reselect` als Dep ergänzen (`yarn workspace @recrest/app add reselect`). Aggregations (`computeLeaderboard`, Heatmap, alle in §C.3) als `createSelector(...)`.
- **Test:**
  - Rust-Unit für Range-Filter (Tmp-Repo mit 10 Commits über 6 Monate, Range 30d nimmt 5).
  - Rust-Unit für Streaming-Chunks (Tmp-Repo mit 6_000 Commits → 6 Events).
  - Slice-Test für Range-Merging mit allen 4 Cases (subset/overlap-left/overlap-right/disjoint).
  - E2E: Range-Picker → Daten kommen, Truncation-Banner erscheint.

### C.2 Custom Timerange-Picker

- **Symptom:** "activity custom timerang option."
- **Neue Dateien:** `app/src/components/atoms/DateRangePicker/index.tsx`.
- **Betroffene Dateien:** `app/src/pages/app/Activity/index.tsx`.
- **Vorgehen:**
  1. Atom: zwei Date-Inputs + Preset-Chips (`7d`, `30d`, `90d`, `1y`, `all`). `all` = oldest commit timestamp via Backend-Command `get_oldest_commit_date(repoIds)`.
  2. Range in URL-Param (`?since=…&until=…`) + `activitySlice.selectedRange` (Single Source of Truth).
  3. Anwenden auf Activity-Page (alle Cards), Dashboard (relevante Cards).
  4. i18n-Strings in `common.json` (`activity.range.preset_7d` etc., en + de).
- **Test:** Component-Test mit URL-Sync.

### C.3 Echte Insights (Trends, Streaks, Top-Aggregations)

- **Symptom:** "echte Insights."
- **Betroffene Dateien:**
  - `app/src/lib/insights.ts` (neu).
  - `app/src/lib/activityStats.ts` — vorhandene Aggregations bleiben.
  - `app/src/components/organisms/activity/cards/insights/*` (neuer Ordner).
- **Timezone-Konvention (kritisch für Streaks/Gaps):** Day-Buckets in **lokaler TZ des Users** (nicht UTC). Begründung: "Streak = ich committe jeden Tag" matcht den Lebensrhythmus. Implementation: `new Date(commit.timestamp).toLocaleDateString('en-CA')` für `YYYY-MM-DD`-Key **vor** Bucketing. JSDoc dokumentiert das pro Funktion.
- **Vorgehen:**
  1. Pure-Function-Modul `app/src/lib/insights.ts` mit:
     - `computeStreaks(commits, today: Date) → { current, longest, longestRange: { start, end } }`.
       - Streak = konsekutive Local-Days mit ≥1 Commit. `current` läuft bis heute; bricht bei einem Tag ohne Commit.
     - `computeTrend(commits, periodDays) → { direction: 'up'|'down'|'flat', deltaPct }`.
       - Vergleich `[today - periodDays, today]` vs `[today - 2*periodDays, today - periodDays]`. `flat` bei `|deltaPct| < 5%`.
     - `computeTopAuthorsByPeriod(commits, periodDays, limit) → Author[]`.
     - `computeMostActiveDayOfWeek(commits) → { day: 0..6, count }` (lokale Wochentag-Indizierung).
     - `computeAvgCommitsPerWeek(commits) → number`.
     - `computeLongestGap(commits) → { startDate, endDate, days }` — max konsekutive Local-Days **ohne** Commit zwischen erstem und letztem Commit; `days = endDate - startDate` (inkl. beider Enden).
  2. Eine Insight-Card pro Funktion (kompakt, ein KPI + Beschriftung + ggf. Mini-Chart).
  3. ActivityPage neuer Block "Insights" (Grid 3×2).
- **Test:**
  - Unit-Test pro Funktion mit fixen Commit-Arrays in deterministischer TZ (`vi.setSystemTime` + `process.env.TZ = 'Europe/Berlin'` im Setup).
  - Edge-Cases: leerer Array, ein Commit, Commits am Tag-Wechsel UTC→Local.

---

## Phase D — Settings (Reste)

### D.1 Terminal-Detection IPC + Profile + Custom-Command

- **Symptom:** "Im system punkt in general soll man auch das richtige terminal und terminalprofil auswählen können."
- **Heutiger Stand:** Backend-Spawn-Plans + Shell-Detection sind fertig; UI hat Dropdowns, nutzt aber **hardcodierte Stub-Maps** statt eines echten IPC-Calls.
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/terminal.rs` — neuer `#[tauri::command] detect_terminals() → Vec<TerminalDetectionDto>`.
  - `app/src-tauri/src/lib.rs` — `generate_handler![..., detect_terminals]` (beide Blöcke).
  - `app/src/pages/app/Settings/components/GeneralTab/sections/SystemSection/index.tsx` — Stub-Maps raus, `detect_terminals` aufrufen.
  - `app/src/store/slices/settings*.ts` + ggf. Thunk `loadDetectedTerminals`.
  - `shared/src/types/settings.ts` — `TerminalSettings.profile` / `.customCommand` sind serverseitig schon da; TS-DTO ergänzen falls fehlt.
- **Vorgehen:**
  1. **Detection-Command** `detect_terminals() → Vec<TerminalDetectionDto>` mit OS-Probes:
     - **macOS:** `mdfind "kMDItemContentType == 'com.apple.application-bundle'"` auf bekannte Bundle-IDs (`com.apple.Terminal`, `com.googlecode.iterm2`, `dev.warp.Warp-Stable`, `net.kovidgoyal.kitty`, `org.alacritty`, `com.github.wez.wezterm`). Fallback: `which`.
     - **Linux:** `which`-Check pro `TerminalId`.
     - **Windows:** `where.exe <name>` (kein `which`). Registry-Lookup für Windows Terminal unter `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\`. cmd.exe immer vorhanden (`%SystemRoot%\System32\cmd.exe`).
     - DTO: `{ id: TerminalId, available: bool, version?: string }`.
  2. **UI-Verkabelung:**
     - `SystemSection` ruft `invoke(TauriCommand.DETECT_TERMINALS)` per `useEffect` einmal beim Mount.
     - Pure-Web-Fallback (`!isTauri()`): aktuelle Stub-Map bleibt als Default.
     - Profile-Input: nur sichtbar für Terminals mit `--profile`/`-p`-Support (gnome-terminal, kitty `--session`, wezterm `--config`, wt `-p`). Liste der "profile-fähigen" IDs als Constant in `@recrest/shared`.
     - Custom-Command-Textfield (`{path}`-Placeholder) nur für `id: Custom`.
  3. **Verbindung zu `open_at`:** `terminal_spawn_plan` muss `settings.profile` honorieren (bei profile-fähigen Terminals als zusätzliches Flag mitgeben).
- **Test:**
  - Rust-Unit für `detect_terminals` mit Mock-Probe-Funktion: 0 installiert / 1 installiert / alle installiert.
  - Rust-Unit für `terminal_spawn_plan` mit gesetztem `profile` (gnome-terminal/kitty/wezterm/wt).
  - Component-Test: Profil-Input erscheint nur bei profile-fähigen IDs, Custom-Command nur bei `id: Custom`.
  - Manuell: Toggle Terminal → "Open in terminal" auf RepoRow → richtiges Terminal mit richtigem Profil startet.

### D.2 Token-Hint Deep-Link

- **Symptom:** "bei git token description - welche settings."
- **Heutiger Stand:** Required-Scopes-Chips sind da, Bitbucket-Note auch. Was fehlt: Klickbarer Link auf die "Token erstellen"-Seite des Providers.
- **Betroffene Dateien:**
  - `app/src/pages/app/Settings/components/AccountsTab/parts/ProviderRow/index.tsx` — Link in den Scopes-Block.
  - `app/src/lib/constants/providers.constants.ts` — `PROVIDER_TOKEN_CREATION_URLS`-Map.
  - `app/src/i18n/locales/{en,de}/settings.json` — `providers.token_create_link`-Key.
- **Vorgehen:**
  1. Constant `PROVIDER_TOKEN_CREATION_URLS` in `providers.constants.ts`:
     - GitHub: `https://github.com/settings/tokens/new`.
     - GitLab: `<baseUrl>/-/profile/personal_access_tokens` (für self-hosted aus `connection.baseUrl` ableiten, sonst `https://gitlab.com/-/profile/personal_access_tokens`).
     - Bitbucket: `https://bitbucket.org/account/settings/app-passwords/new`.
  2. Im `Scopes`-Block kleinen Link unterhalb der Chips: `t("settings.providers.token_create_link", { provider })` mit `openExternal(url)` als Click-Handler (kein normaler `<a>`, weil Tauri-Window nicht abdriften soll).
- **Test:** Component-Test pro Provider — Link rendert, Click ruft `openExternal` mit korrekter URL.

---

## Phase E — Quality / Test-Suite

### E.1 Test-Coverage signifikant ausbauen

- **Symptom:** "Wir müssen die Test-Suite erhöhen, um solche Dinge direkt auszubessern."
- **Aktueller Stand (Recon):**
  - Vitest gesamt ~120 Files (App+Shared+Landing).
  - Reducer-Tests: `uiReducer.test.ts`, `reposReducer.test.ts` (Plan 3) — restliche fehlen.
  - E2E: ~30 Specs (überwiegend Landing).
- **Vorgehen:**
  1. **Slices/Reducer** — Pro Reducer Test mit echten Action-Creators + gemocktem `invoke`:
     - `prsReducer.test.ts`.
     - `providersReducer.test.ts` (Token set/clear, Connections-Updates).
     - `settingsReducer.test.ts`.
     - `remoteImportReducer.test.ts`.
     - (neuer `activityReducer.test.ts` aus C.1).
  2. **Lib-Funktionen** — Tests für jede pure Function ohne Test (Sweep: `rg "^export (function|const)" app/src/lib | grep -v "test\.ts"`):
     - Insights, activityStats-Module, charts-Utils, repoEnrich, brandFromUrl, timeAgo, bot.utils (bereits getestet), etc.
  3. **Rust-Backend:**
     - Provider-Tests mit `wiremock` pro Provider (Plan 3/05 erledigt für `gitlab`, `bitbucket`, `github`).
     - `git/scanner`, `git/status`, `git/logo`, `git/author_normalize` — Tmp-Repo-Tests.
     - `commands/repos`, `commands/git_index`, `commands/git_config` — Tmp-Repo + State-Mock.
     - `auth/token` — in-memory mock aus Plan 3/05.
  4. **E2E (Playwright)** — Critical Paths:
     - Onboarding-Flow.
     - Repo-Add → Status erscheint.
     - PR-View → Drawer öffnet → Details.
     - Settings-Token setzen → Provider zeigt "connected".
- **Coverage-Ziele:**
  - **App-weit (Vitest):** 60% Lines / 50% Branches.
  - **Pro Reducer:** mind. 1 Test pro Action + 1 Test pro Async-Thunk.
  - **Pro Lib-Modul** (`activityStats`, `insights`, `notifications`, `charts/palette`, `charts/smoothLine`, `git/author_normalize` Frontend-Side): 80% Lines.
  - **Rust-Backend (`cargo test`):** Happy-Path + 2 Failure-Cases pro Modul.
- **Tooling:**
  - `yarn workspace @recrest/app test --coverage` — Vitest-Config in `app/vitest.config.ts` mit `coverage.thresholds.{lines: 60, branches: 50}`.
  - Per-File-Threshold via `coverage.perFile = false` (Aggregat) — später ggf. per-File.
  - CI-Job-Ergänzung: Coverage-Report als Artifact + Diff-Bot-Kommentar bei PR.
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

- C.1/C.2: Range-Picker `all` lädt Repo-volle History ohne UI-Hang.
- C.3: Insight-Cards zeigen plausible Werte (Streak vs. tatsächlicher git log).
- D.1: pro OS Default-Terminal wechselt und "Open in terminal" reagiert — Profil-Input erscheint nur bei profile-fähigen Terminals.
- D.2: Token-Hint zeigt richtige Scopes + funktionierenden Deep-Link.
- E.1: `yarn test --coverage` bestätigt ≥60% Lines.
