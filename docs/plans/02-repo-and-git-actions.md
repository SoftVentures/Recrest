# Plan 2 — Repo Management & Git Actions

## Context

Konkretisierung der Repo-Verwaltungs-, Git-Aktionen- und Provider-Integrations-Items aus `docs/plans/future.md`. Phase A enthält die kaputten Repo-Aktionen (open in terminal/folder), Phase B die Polish-Features für Repo-Verwaltung, Phase C neue Git-Aktionen (stage/commit/config/workflows/diff/pages), Phase D die Provider-Tiefe für GitLab/Bitbucket.

Ergänzt zur Settings-Erweiterung in Plan 3 (Terminal-Wahl löst auch A.1 hier).

---

## Phase A — Bugs (Repo-Aktionen kaputt)

### A.1 "Open repo in terminal" geht nicht

- **Symptom:** "open repo in terminal geht nicht."
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/terminal.rs:6-71` — OS-spezifische Spawn-Logik.
  - `app/src/pages/MergeRequestsPage.tsx:305` — Caller (weitere Caller per `rg "invoke.*terminal" app/src` finden).
- **Konkrete Reproduktions-Schritte:**
  - **macOS:** Click "Open in Terminal" auf RepoRow. `terminal.rs:27-28` ruft `open -a Terminal <path>`. Funktioniert nur wenn (a) Terminal.app unter `/System/Applications/Utilities/Terminal.app` liegt (auf manchen Setups umbenannt/entfernt) und (b) `<path>` keine Sonderzeichen enthält. `which open` + `open -a Terminal /tmp` aus User-Shell verifizieren.
  - **Linux/Arch+Hyprland:** `terminal.rs:34-65` Fallback-Chain `$TERMINAL → gnome-terminal → konsole → xterm` trifft typische Arch/Hyprland-User nicht (kitty/foot/wezterm/alacritty dominieren). Außerdem: detached child von Compositor-Session erbt evtl. nicht `WAYLAND_DISPLAY`.
  - **Windows:** `wt.exe` liegt in `%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe`. Wenn Windows Terminal nicht installiert ist, existiert `wt.exe` als Stub und öffnet den Store. Fallback `cmd.exe /C start cmd.exe /K cd /d <path>` quotet Pfade mit Spaces nicht (kein `"<path>"`).
- **Vorgehen:**
  1. **Settings-getriebene Terminal-Wahl (siehe Plan 3 §D.1)** ist Voraussetzung. Plan 3 muss vor Plan 2 §A.1 landen.
  2. `terminal.rs` umstellen: `open_at(path)` liest `AppSettings.terminal`, dispatcht zu Handler pro `TerminalId`. Fallback-Chain greift nur bei `id = "auto"`.
  3. Per-Terminal-Handler in `app/src-tauri/src/commands/terminal/{macos,linux,windows}.rs` (Sub-Modul). Mit `tokio::process::Command::arg(path)` für Path-Quoting (kein String-Concat).
  4. **Per-OS Argv-Tabelle (in `terminal.rs` als Konstanten):**

     | OS    | Terminal-ID                       | Argv-Pattern                                                                                                                                      |
     | ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
     | macOS | `system-default`                  | `open -a Terminal "<path>"`                                                                                                                       |
     | macOS | `iterm`                           | `osascript -e 'tell application "iTerm" to create window with default profile command "cd <path>"'` (bessere Tab-Integration als `open -a iTerm`) |
     | macOS | `warp`                            | `open -a Warp "<path>"`                                                                                                                           |
     | macOS | `kitty` / `alacritty` / `wezterm` | wie Linux unten                                                                                                                                   |
     | Linux | `kitty`                           | `kitty --directory <path>`                                                                                                                        |
     | Linux | `foot`                            | `foot --working-directory=<path>`                                                                                                                 |
     | Linux | `alacritty`                       | `alacritty --working-directory <path>`                                                                                                            |
     | Linux | `wezterm`                         | `wezterm start --cwd <path>`                                                                                                                      |
     | Linux | `gnome-terminal`                  | `gnome-terminal --working-directory=<path>`                                                                                                       |
     | Linux | `konsole`                         | `konsole --workdir <path>`                                                                                                                        |
     | Win   | `wt`                              | `wt.exe -d "<path>"`                                                                                                                              |
     | Win   | `pwsh`                            | `pwsh.exe -NoExit -Command "Set-Location -LiteralPath '<path>'"`                                                                                  |
     | Win   | `powershell`                      | `powershell.exe -NoExit -Command "Set-Location -LiteralPath '<path>'"`                                                                            |
     | Win   | `cmd`                             | `cmd.exe /K cd /d "<path>"`                                                                                                                       |

  5. **Wayland-Detection:** detachte Children erben Env per Default — bei `Command::env_clear` aufpassen, sonst nicht aufrufen.

- **Test:**
  - Rust-Unit pro Handler mit `Command`-Builder Argv-Snapshot (kein Spawn nötig).
  - Manuelle Smokes pro OS + pro Terminal-Variante (Matrix in PR-Beschreibung).

### A.2 "Open in folder" geht nicht

- **Symptom:** "open in folder geht auch nicht."
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/git_ops.rs:155-192` — `open_in_explorer` Custom-Spawn (`explorer`/`open`/`xdg-open`).
  - Caller: `app/src/pages/RepoDetailPage.tsx:231` u.a.
  - `app/src-tauri/capabilities/default.json` (oder analog) — Capability-Permissions.
- **Root-Cause-Verifikation pro OS:**
  - **macOS:** `open <path>` öffnet den Folder im Finder, **selektiert/highlightet aber nicht** — `open -R <path>` würde reveal-in-Finder machen. User-Erwartung ist meist Reveal.
  - **Linux:** `xdg-open <path>` öffnet im File-Manager, ohne Reveal.
  - **Windows:** `explorer <path>` öffnet den Folder; `explorer /select,<path>` revealed.
    → Aktuelles Verhalten "öffnet nur" wird vom User als "geht nicht" wahrgenommen, weil Reveal erwartet ist.
- **Vorgehen:**
  1. **Direkt-Aufruf vom Frontend** via `import { revealItemInDir } from '@tauri-apps/plugin-opener'`. Tauri v2 plugin-opener implementiert OS-natives Reveal.
  2. **Capability-Permission konkret hinzufügen:** in `app/src-tauri/capabilities/default.json` (Datei lesen + ergänzen) den Eintrag `"opener:allow-reveal-item-in-dir"` zur Permissions-Liste. Ohne diesen Eintrag failt der Call in Production-Builds silent.
  3. Bestehenden Rust-Command `open_in_explorer` entfernen (oder als Fallback behalten falls Plugin-Capability fehlt — dann mit besserem Quoting + `-R` Flag auf macOS, `/select,` auf Windows).
  4. Caller in `RepoDetailPage.tsx:231` und allen weiteren (per `rg "invoke.*open_in_explorer|invoke.*reveal" app/src`) umstellen.
- **Test:**
  - Manuell pro OS — Click "Open Folder" → File-Manager öffnet UND Repo-Verzeichnis ist visuell markiert/selektiert.
  - Production-Build-Test: nicht nur Dev-Run (Capabilities greifen anders).

---

## Phase B — Polish (Repo-Verwaltung)

### B.1 Repo-Import-Defaults

- **Symptom:** "bei repo import default verwenden."
- **Betroffene Dateien:**
  - `app/src/components/organisms/onboarding/OnboardingWizard/index.tsx`.
  - `app/src/store/slices/reposSlice.ts:30-130`.
  - `app/src-tauri/src/config/settings.rs:30-115` (`AppSettings`).
- **Vorgehen:**
  1. `AppSettings.repoImportDefaults: { providerId?, scanPath?, group? }` ergänzen.
  2. Wizard liest beim Mount Defaults; Felder vorausgefüllt aber editierbar.
  3. Beim Submit optional "Als Default speichern"-Checkbox.
- **Test:** Component-Test mit gesetzten Defaults.

### B.2 Default-Folder bei mehreren Scan-Paths

- **Symptom:** "bei mehreren ordnern 'default' folder festlegbar."
- **Betroffene Dateien:**
  - `app/src-tauri/src/config/settings.rs:30-115` — `scan_paths: Vec<String>` → ergänzen `default_scan_path: Option<String>`.
  - Settings-UI: `app/src/components/organisms/settings/tabs/StorageSettings/` (oder existierender Pfad-Editor).
- **Vorgehen:**
  1. Schema erweitern, Migration: bei alten Settings ohne Field → default = erster Eintrag.
  2. UI: Radio-Spalte neben Pfad-Liste.
  3. Repo-Import wählt Default-Pfad als Default vor.
- **Test:** Migration-Test, UI-Snapshot.

### B.3 Favicon als Repo-Logo-Fallback

- **Symptom:** "bei repo logo auch favicon nutzen."
- **Betroffene Dateien:**
  - `app/src-tauri/src/git/logo.rs:87-149` — lokale Detection.
  - `app/src/components/molecules/RepoAvatar/index.tsx:93-227` — Render-Priorität.
  - Neue Settings-Sub-Struktur `PrivacySettings` (siehe Plan 1 Phase 0.1).
  - Neuer Cache-Pfad: `$APP_CACHE_DIR/favicons/<sha256(host)>.png`.
- **Vorgehen:**
  1. **Tauri-Command `fetch_favicon(remote_url)`** mit folgenden Constraints:
     - Origin parsen (`url::Url`); nur `https?` schemes erlaubt; private/Loopback-IP-Adressen abweisen oder explizit erlauben (Setting `privacy.fetchFaviconsOnLan: false` default).
     - **Privacy-Gate:** nur wenn `AppSettings.privacy.fetchFavicons === true` (Default `false`). Setting muss in Onboarding/Settings prominent erklärt werden.
     - HEAD `https://<host>/favicon.ico`; bei 404 GET `/` + Parse `<link rel="icon">` (mit `scraper`-crate; nicht eval'en).
     - **Self-signed Certs:** für self-hosted GitLab default ablehnen (`reqwest` default), aber Setting `providers.<id>.allowInsecureFavicon: bool` zur expliziten Whitelistung pro Provider (nur via UI, nicht per env).
     - **Concurrency-Limit:** Semaphore mit max 4 parallel fetches (gegen 50-Repos-on-Boot-Storm).
     - **Caching:** Cache-Header beachten (ETag/Last-Modified), `max-age` auf 7 Tage cappen, Negativ-Cache (404) auf 24h.
     - **Validation:**
       - PNG: max 256KiB, decode mit `image`-crate, sonst verwerfen (PNG-Bombs).
       - SVG: nicht akzeptieren wenn `<script>`/`<foreignObject>` vorhanden — sicherer: SVGs ablehnen, nur Raster akzeptieren.
       - Output immer als PNG re-encoden (256×256, Alpha) im Cache.
  2. `RepoAvatar`-Priority-Ladder erweitern:
     - User-Override → Auto-Detected-Logo → Brand-Icon → **Favicon (neu)** → Letter-Tile.
- **Test:**
  - Rust-Unit mit `wiremock`: 200/404/Redirect-Loop/SVG-mit-Script/PNG-Bomb (10MB Datei) → korrekt abgelehnt.
  - Slice-Test: Setting deaktiviert → kein fetch.
  - Integration: 50 Repos, Limit greift (max 4 parallel).

### B.4 Click auf Pin-Icon zum Unpinnen

- **Symptom:** "click auf pin icon to unpin."
- **Betroffene Dateien:** `app/src/components/organisms/repos/RepoRow/index.tsx:128,195-197`.
- **Vorgehen:**
  - Pin-Icon (Zeile 128) bekommt `onClick={(e) => { e.stopPropagation(); dispatch(togglePinnedRepo(id)); }}`.
  - `cursor: pointer` + Tooltip "Click to unpin" / "Click to pin" je nach Zustand.
- **Test:** Component-Test (Click → Action), E2E (Pin/Unpin via Icon).

### B.5 Repo-Übersicht — Flat-List + sortierbar

- **Symptom:** "nach ordner (aktuelle ansicht) aber auch als reine liste mit welche dann oben über den 'tabellen/listenkopf' sortiert werden kann."
- **Betroffene Dateien:** `app/src/components/organisms/repos/RepoList/index.tsx:19-96`.
- **Vorgehen:**
  1. View-Mode-Enum `'grouped' | 'flat'` in `uiSlice` (persisted).
  2. Flat-Mode: einzelner sortable Header (Name, Branch, Status, Last Activity, Pinned), Klick toggelt Asc/Desc, Indicator-Pfeil.
  3. Sort-State `{ field, direction }` ebenfalls in `uiSlice` (persisted).
  4. Pinned bleibt oben (siehe Plan 1 A.5) auch im Flat-Mode.
- **Test:** Component-Test mit gemischten Repos + Sort-Permutationen.

### B.6 SSH-Funktion pro Repo

- **Symptom:** "repo funktion für ssh."
- **Betroffene Dateien:**
  - `app/src-tauri/src/commands/clone.rs:80-96` — Credential-Chain.
  - `app/src-tauri/src/commands/git_ops.rs:46-131` — fetch/pull/push.
  - `app/src-tauri/src/config/settings.rs` — `RepoRecord` erweitern um `ssh_key_path: Option<String>` mit `#[serde(default)]` (siehe Plan 1 Phase 0.1).
  - Neuer Repo-Detail-Sub-Panel "SSH" (`app/src/components/organisms/repos/RepoSshSettings/index.tsx`).
- **Vorgehen:**
  1. **Ohne UI-Override:** ssh-agent (Default heute, bleibt).
  2. **Mit Override** in Credential-Callback (git2):
     - Signatur: `git2::Cred::ssh_key(username, public_key: Option<&Path>, private_key: &Path, passphrase: Option<&str>)`.
     - **Wichtig:** `username` kommt aus dem `username_from_url`-Callback-Parameter (git2 contract), **nicht** aus Settings. Settings liefert nur den Pfad.
     - Plan-Code:

       ```rust
       Cred::ssh_key(
           username_from_url.unwrap_or("git"),
           Some(&public_key_path),
           &private_key_path,
           passphrase.as_deref(),
       )
       ```

  3. **Passphrase NICHT in Settings** — wenn benötigt: Frontend-Prompt-Dialog → einmalige Übergabe pro Session in einem geschützten in-Memory-Cache (Rust-side `RwLock<HashMap<RepoId, ZeroizeOnDrop<String>>>`).
  4. **UI:** pro Repo "SSH Key" Selector (Browse-Picker für `~/.ssh/`). Default `id_ed25519`/`id_rsa` listet, plus "Other…" Datei-Picker.
  5. **Sicherheits-Hinweis im Plan:** Plan-Authoren müssen sicherstellen, dass die ausgewählten Pfade nicht in Logs landen (auch nicht als Debug-`Display`).

- **Test:**
  - Rust-Unit mit Tmp-Repo + Test-SSH-Key (Test-Fixture in `tests/fixtures/ssh/test_id_ed25519`): Clone schlägt mit Default-Cred fehl, mit Override-Pfad erfolgreich.
  - E2E (Mocked-Server): Repo-Detail SSH-Tab → Pfad setzen → Status-Check via `git fetch`.
  - Manuell mit privatem GitHub-Repo + Custom-Key.

---

## Phase C — Git-Aktionen (Features)

### C.1 Stage / Unstage einzelner Files

- **Symptom:** "Man soll stagen und unstagen können."
- **Neue Dateien:**
  - `app/src-tauri/src/commands/git_index.rs` — `git_stage(repoId, paths)`, `git_unstage(repoId, paths)`, `git_discard(repoId, paths)`.
  - `app/src/components/organisms/repos/WorkingCopyPanel/index.tsx` — UI.
- **Bestehende Quellen:**
  - `app/src-tauri/src/git/status.rs:1-200` — `RepoStatusDto.changedFiles` mit `status: [Staged|Unstaged|Untracked|Conflicted]`.
- **Vorgehen:**
  1. **Backend:**
     - `git2::Repository::index() → Index`.
     - **Pathspec-Semantik:** Pfade werden literal interpretiert (keine Globs). Frontend liefert relative Pfade vom Repo-Root, Backend prüft mit `Repository::status_should_ignore(path)` und überspringt ignorierte Files (außer expliziter Force-Flag).
     - **Submodules:** Falls ein Pfad einem Submodule entspricht (`Submodule::open()`), Aktion auf das Top-Level-Repo anwenden (Submodule-Reference stagen), nicht ins Submodule descenden.
     - `git_stage`: für Untracked/Modified `index.add_path(Path::new(p))`; für Deleted `index.remove_path(Path::new(p))`. Final `index.write()`.
     - `git_unstage`: `Repository::reset_default(Some(&head_obj), pathspecs)` mit `head_obj = repo.head()?.peel(ObjectType::Commit)?`. Bei Initial-Repo (kein HEAD) Fallback `index.remove_path()` + `index.write()`.
     - `git_discard`: **gefährlich** — zwei-Phasen-Approach:
       1. Tracked Files: `CheckoutBuilder::new().force().path(p)`, `Repository::checkout_head(Some(&mut builder))`.
       2. Untracked Files: `std::fs::remove_file(p)` **nur** wenn `repo.status_file(p)` `WT_NEW` zurückgibt UND der Pfad nicht ignoriert ist UND der File nicht in einer hardcoded-deny-Liste (`.env`, `.env.local`, `id_*`, `*.pem`) liegt. Bei deny-Match: Tauri-Result `RequiresUserConfirmation` → Frontend zeigt Confirmation-Dialog (siehe Plan 1 §D.3) der den Filename nennt.
     - Alle Commands triggern `repo://status`-Refresh via existierendem Watcher.
     - **Hooks:** `git2` führt keine Hooks aus — siehe C.2 für die Diskussion.
  2. **Frontend:**
     - `WorkingCopyPanel` listet `changedFiles` mit Checkboxes (zwei Sektionen: Staged, Unstaged/Untracked).
     - Bulk-Actions "Stage all", "Unstage all", "Discard all" (mit Confirmation-Dialog).
     - Diff-Preview pro File via Hover/Click (Renderer aus C.5).
     - Bei `RequiresUserConfirmation`: ConfirmDialog mit Liste der gefährdeten Dateien.
- **Test:**
  - Rust-Unit mit Tmp-Repo (Pattern aus `git/scanner.rs` Tests — falls keine vorhanden, neu mit `tempfile`-crate):
    - Stage/Unstage tracked file.
    - Stage untracked, dann unstage.
    - Discard tracked → reset auf HEAD.
    - Discard untracked `.env` → `RequiresUserConfirmation`.
    - Submodule-Pfad → kein descent.
  - Component-Test mit Mock-Status.
  - E2E: File touch → stage → unstage.

### C.2 Commit-Aktion mit Default-Template

- **Symptom:** "commiten können default mit `{author}: {date}` -> aber auch mit eigener nachricht."
- **Neue Dateien:**
  - Erweiterung von `git_index.rs` um `git_commit(repoId, message)`.
  - `app/src/components/organisms/repos/CommitDialog/index.tsx`.
- **Hooks-Entscheidung (kritisch):** Der Plan **shellt zu `git commit` aus** statt libgit2 direkt zu nutzen, sobald Pre-Commit-Hooks im Repo existieren. Begründung: für eine Dev-Tool-Zielgruppe sind silent-bypassed `pre-commit`/`commit-msg`/`prepare-commit-msg` Hooks ein Footgun (linting/formatting/secret-scan-Hooks würden umgangen).
- **Vorgehen:**
  1. **Hook-Detection:** Vor jedem Commit prüfen ob `<repo>/.git/hooks/pre-commit` (oder via `core.hooksPath`-config) existiert UND ausführbar ist.
     - **Wenn ja:** `tokio::process::Command::new("git").args(["commit", "-m", message]).current_dir(repo).spawn()` — Hooks laufen wie nativ.
     - **Wenn nein:** libgit2-Pfad (schneller, kein git-Binary nötig):

       ```rust
       repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
       ```

  2. **Signature:**
     - Primär `repo.signature()` (liest local + global git config).
     - **Fallback:** wenn local/global config fehlt → `AppSettings.gitConfigOverride.userName/userEmail` (per C.3 editierbar). Wenn auch das fehlt → Tauri-Error `RequiresGitConfig` → Frontend zeigt Hint mit Link zu Settings.
  3. Frontend `CommitDialog`:
     - Multiline-Input + "Default-Template einfügen"-Button.
     - Default-Template `AppSettings.commitMessageTemplate` (default `"{author}: {date}"`), gerendert mit dynamischen Werten (`{author}` aus Signature, `{date}` ISO-Datum).
     - Validation: leere Message disabled, max 72 Chars für Subject-Line empfohlen.
     - **Hook-Indicator:** Badge "Hooks aktiv" wenn `.git/hooks/pre-commit` existiert.

- **Test:**
  - Rust-Unit `git_commit` Pfad libgit2 mit Tmp-Repo.
  - Rust-Unit `git_commit` Pfad shell-out mit Tmp-Repo + dummy hook der `exit 1` macht → Commit blockt.
  - Component-Test CommitDialog mit Template-Insert.
  - E2E: stage → commit → log zeigt neuen Commit.

### C.3 Git-Config einsehen + bearbeiten

- **Symptom:** "git-config einsehen und bearbeiten können."
- **Neue Dateien:**
  - `app/src-tauri/src/commands/git_config.rs` — `get_git_config(repoId | global)`, `set_git_config(scope, key, value)`.
  - `app/src/components/organisms/settings/tabs/GitConfigSettings/index.tsx`.
- **Vorgehen:**
  1. Backend:
     - `git2::Config::open_default()` für Global, `Repository::config()` für lokal.
     - Whitelist: `user.name, user.email, core.editor, core.autocrlf, init.defaultBranch, pull.rebase, commit.gpgsign`.
     - Beliebige Keys editieren? Optional ein "Advanced Mode" mit Custom-Key.
  2. Frontend:
     - Tab "Git Config" → Form mit Whitelist-Feldern.
     - Per-Repo Override (separater Tab im Repo-Detail).
- **Test:** Rust-Unit mit Tmp-Repo, Form-Submit-Test.

### C.4 CI-Workflows verwalten (Actions / GitLab CI / Bitbucket Pipelines)

- **Symptom:** "Git actions oder workflows verwalten."
- **Provider-Trait erweitern (`app/src-tauri/src/providers/trait.rs`):**
  - `list_workflows(remote_url) → Vec<WorkflowDto>`.
  - `list_workflow_runs(remote_url, workflow_id, limit) → Vec<WorkflowRunDto>`.
  - `trigger_workflow(remote_url, workflow_id, git_ref, inputs: WorkflowInputs) → Result<()>`.
  - `cancel_workflow_run(remote_url, run_id) → Result<()>`.
- **DTOs (`api.rs`):**
  - `WorkflowDto { id, name, path, state, inputsSchema: Vec<WorkflowInputDef> }`.
  - `WorkflowRunDto { id, runNumber, status, conclusion, headSha, createdAt, htmlUrl, actor }`.
  - `WorkflowInputDef { key, label, type: 'string'|'number'|'choice'|'boolean', required, default, choices? }` — normalized über die drei Provider.
  - `WorkflowInputs = BTreeMap<String, WorkflowInputValue>` mit `WorkflowInputValue = String|Number|Bool`.
- **Pro Provider:**
  - **GitHub Actions:**
    - List: `GET /repos/:o/:r/actions/workflows`.
    - Inputs aus YAML: `GET /repos/:o/:r/contents/<workflow_path>` → YAML parsen (`serde_yaml`) → `on.workflow_dispatch.inputs.*` extrahieren.
    - Dispatch: `POST /repos/:o/:r/actions/workflows/:id/dispatches` mit `{ ref, inputs }`.
    - Cancel: `POST /repos/:o/:r/actions/runs/:run_id/cancel`.
  - **GitLab Pipelines:**
    - List: `GET /projects/:id/pipelines` (Pipelines sind nicht "Workflows"; semantisches Mapping: ein "Workflow" = eine `.gitlab-ci.yml` Datei pro Branch — ggf. kondensieren auf Branch-Level).
    - Inputs: `GET /projects/:id/pipeline_schedules` für scheduled mit Variables, oder Variables aus aktueller `.gitlab-ci.yml` extrahieren.
    - Dispatch: `POST /projects/:id/pipeline` mit `{ ref, variables: [{ key, value }] }` — Mapping: `WorkflowInputs` → `variables[]`.
    - Cancel: `POST /projects/:id/pipelines/:id/cancel`.
  - **Bitbucket Pipelines:**
    - List: `GET /repositories/:ws/:r/pipelines/`.
    - **Inputs nicht unterstützt** durch Bitbucket — `WorkflowDto.inputsSchema` ist immer `vec![]`. UI deaktiviert Inputs-Form.
    - Dispatch: `POST /repositories/:ws/:r/pipelines/` mit `{ target: { ref_name, ref_type: 'branch', selector? } }`.
    - Cancel: `PUT /repositories/:ws/:r/pipelines/:uuid/stopPipeline`.
- **Frontend:** Repo-Detail neuer Tab "CI" — Liste der Workflows + Run-History + "Run workflow"-Button mit dynamischem Form aus `inputsSchema`.
- **Test:**
  - Rust-Unit pro Provider mit `wiremock`-Fixtures (Sample JSON für list/dispatch/cancel committen unter `app/src-tauri/tests/fixtures/<provider>/workflows/`).
  - Component-Test für CI-Tab + dynamic-form.
  - YAML-Parsing-Test für GitHub `workflow_dispatch.inputs`.

### C.5 MRs mit Diff-View + Comment-Posting

- **Symptom:** "Merge requests mit code changes einsehen & verwalten."
- **Bestehender Provider-Surface:** `get_pull_request_detail(remote_url, pr_number) → PullRequestDetailDto` existiert (Plan 2 §D.1 nutzt das auch). DTO erweitern, **nicht** neuen Command.
- **Provider-Trait erweitern (`trait.rs`):**
  - `get_pr_diff(remote_url, pr_number) → Vec<FileDiffDto>`.
  - `post_pr_comment(remote_url, pr_number, body, path?, position?) → Result<CommentDto>`.
- **DTOs:**
  - `FileDiffDto { path, oldPath?, status: Added|Modified|Deleted|Renamed, hunks: Vec<DiffHunk> }`.
  - `DiffHunk { oldStart, oldLines, newStart, newLines, lines: Vec<DiffLine> }`.
  - `DiffLine { kind: Context|Add|Remove, content, oldLineNo?, newLineNo? }`.
  - `CommentPosition { side: 'LEFT'|'RIGHT', line, startLine? }` — für Multi-Line-Comments (GitHub spezifisch).
- **Pro Provider:**
  - **GitHub:** `GET /repos/:o/:r/pulls/:n/files` (Diff per File) → DiffDto. Comments: `POST /repos/:o/:r/pulls/:n/comments` mit `{ body, commit_id, path, line, side }` (neue API; `position` ist legacy).
  - **GitLab:** `GET /projects/:id/merge_requests/:iid/diffs` (Pagination!) → DiffDto. Comments: `POST /projects/:id/merge_requests/:iid/discussions` mit `{ body, position: { base_sha, start_sha, head_sha, position_type, new_path, new_line } }`.
  - **Bitbucket:** `GET /repositories/:ws/:r/pullrequests/:id/diff` (returns plain unified diff text; muss parser-side gesplittet werden — `unidiff`-crate). Comments: `POST /repositories/:ws/:r/pullrequests/:id/comments` mit `{ content: { raw }, inline: { path, to } }`.
- **Frontend:**
  - MR-Drawer (Plan 1 §A.1) bekommt **`tabs`-Variante** (siehe Phase 0.2 Prop-Surface) mit Tab "Files Changed".
  - **Diff-Renderer:** `diff2html` (npm `diff2html`, **nicht** `diff2html-lite` — letzteres existiert nicht als Package). Bundle-Size-Budget: ≤80KB gzipped (per `vite-bundle-analyzer` verifizieren).
    - Alternative: `react-diff-view` (kleiner, mehr Custom-Render-Kontrolle).
    - Entscheidung: starte mit `diff2html`, switche zu `react-diff-view` wenn Bundle-Budget gerissen.
  - **Inline-Comment-Composer:** Click auf Line-Number öffnet Composer. Position-Tracking nutzt `DiffLine.newLineNo`/`oldLineNo` (richtige Side bestimmt sich aus Klick-Spalte).
- **Test:**
  - Rust-Unit pro Provider mit `wiremock` für `get_pr_diff` (Fixtures committen).
  - Rust-Unit für Bitbucket unified-diff-Parsing.
  - Component-Test mit Mock-DiffDto (3 Hunks, Add+Remove+Context).
  - E2E gegen GitHub-Sandbox-Repo mit echtem PR.

### C.6 GitHub/GitLab/Bitbucket Pages

- **Symptom:** "wenn github pages auch das und jeweils das gitlab und bitbucket equivalent."
- **Provider-Trait:**
  - `get_pages_status(remote_url) → Option<PagesStatusDto>`.
  - DTO: `{ url, status: 'building'|'built'|'errored'|'disabled', lastDeployedAt, customDomain? }`.
- **Pro Provider:**
  - **GitHub:** `GET /repos/:o/:r/pages` (404 = disabled), `GET /repos/:o/:r/pages/builds/latest` für `lastDeployedAt`/`status`.
  - **GitLab:** `GET /projects/:id/pages` (Status, URL), `GET /projects/:id/pages/domains` (Custom Domains). Auf älteren GitLab-Versionen evtl. nur via CI-Variable `CI_PAGES_URL` ableitbar — Fallback siehe unten.
  - **Bitbucket:** kein nativer Pages-Service. **Fallback-Algorithmus:**
    1. `GET /repositories/:ws/:r/src/<default-branch>/bitbucket-pipelines.yml`. 404 → `None` zurück.
    2. YAML parsen (`serde_yaml`), nach `pipes`-Patterns suchen die Pages-typisch sind: `atlassian/aws-s3-deploy`, `atlassian/firebase-hosting-deploy`, `atlassian/azure-storage-deploy`, sowie Schritte mit `name: deploy` o.ä.
    3. Wenn gefunden: DTO mit `status: 'built'` (best-effort), `url: None`, `customDomain: None`. UI zeigt: "Pipelines-basiertes Deploy erkannt (kein direkter Status verfügbar)".
    4. Wenn nicht gefunden: `None`.
  - **Selbst-gehostetes GitLab:** API gleich wie GitLab.com.
- **Frontend:** Repo-Detail Block "Deployments" — wenn nicht-`None`, anzeigen mit Link + Status-Badge.
- **Test:**
  - Rust-Unit pro Provider mit `wiremock`-Fixtures.
  - Bitbucket-Fallback-Test mit zwei `bitbucket-pipelines.yml`-Fixtures (eine mit s3-deploy → erkannt, eine ohne → None).

---

## Phase D — Provider-Integration (GitLab/Bitbucket Tiefe)

### D.1 Avatare + Namen für GitLab + Bitbucket

- **Symptom:** "wenn möglich die avatare etc von gitlab und bitbucket […] und auch den namen anstelle von username."
- **Betroffene Dateien:**
  - `app/src-tauri/src/providers/gitlab.rs` (Stub).
  - `app/src-tauri/src/providers/bitbucket.rs` (Stub).
  - `app/src-tauri/src/providers/api.rs:4-108` — DTOs (haben bereits `author_avatar_url: Option<String>`, `name: Option<String>`).
- **Vorgehen:**
  1. **GitLab:** PR-Listing nutzt `/projects/:id/merge_requests` — Felder `author.avatar_url`, `author.name`, `assignees[].avatar_url`. DTO-Mapper befüllen.
  2. **Bitbucket:** `/repositories/:ws/:r/pullrequests` — Felder `author.links.avatar.href`, `author.display_name`. DTO-Mapper befüllen.
  3. Frontend braucht keine Änderung — `RepoAvatar`/`AuthorAvatar` rendert bereits `avatar_url` wenn vorhanden.
- **Test:** Rust-Unit pro Provider, dann manuell mit echten Tokens.

### D.2 Gruppen (GitLab) und Orgs (GitHub) + Workspaces (Bitbucket)

- **Symptom:** "gruppen von gitlab anzeigen orgas bei github."
- **Provider-Trait (`trait.rs:86-102`):** `list_organizations` existiert (Default empty). `list_repositories_for_org` existiert.
- **Vorgehen:**
  1. **GitLab Stub füllen:** `list_organizations` → `/groups?membership=true` → `OrganizationDto { id, name, avatarUrl, slug }`. `list_repositories_for_org` → `/groups/:id/projects`.
  2. **Bitbucket Stub füllen:** Workspaces via `/workspaces?role=member` → analog. Repos via `/repositories/:workspace/`.
  3. **GitHub:** Bereits implementiert — verifizieren, dass `/user/orgs` + `/orgs/:o/repos` korrekt durchgereicht wird.
  4. **UI:** Sidebar/Filter-Drop-down "Group/Org/Workspace" in Repo-Liste + Remote-Import-Wizard.
- **Test:** Rust-Unit pro Provider. UI-Component-Test mit Mock-Orgs.

---

## Phase-übergreifende Verifikation

```bash
yarn typecheck && yarn lint
yarn test
yarn workspace @recrest/app test app/src/components/organisms/repos
cargo test --manifest-path app/src-tauri/Cargo.toml
yarn test:e2e
```

Manuelle Smokes:

- A.1/A.2 pro OS — Default-Terminal + Custom + Reveal.
- B.6 mit privatem SSH-Repo.
- C.1/C.2 mit Tmp-Repo.
- C.4/C.5/C.6 + D.1/D.2 mit Sandbox-Accounts pro Provider.
