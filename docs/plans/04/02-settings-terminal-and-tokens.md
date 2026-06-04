# Plan 04/02 — Terminal-Detection-IPC, Profile-Support & Token-Deep-Link-Verifikation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Echte Terminal-/Shell-Detection per IPC statt Frontend-Stub-Maps, `terminal_spawn_plan` honoriert das gewählte Profil, Profile-/Custom-Command-Felder erscheinen kontextabhängig in den Settings, und der bereits existierende Token-Deep-Link wird per Tests abgesichert.

**Architecture:** Neues `detect_terminals`-Command in `app/src-tauri/src/commands/terminal.rs` mit injizierbarer Probe-Funktion (testbar ohne echtes `$PATH`); `SystemSection` lädt die Detection per Thunk beim Mount und fällt außerhalb von Tauri auf die bestehenden Stub-Maps zurück. Profile-fähige Terminal-IDs werden als Constant in `@recrest/shared` definiert und sowohl vom Rust-Spawn-Planner als auch vom UI konsumiert.

**Tech Stack:** Tauri v2 (Rust), Redux Toolkit, MUI v9 + Emotion `styled()` (kein `sx`), Vitest, i18next (en+de).

**Stand-Korrektur gegenüber Eltern-Plan (Audit 2026-06-03):** D.2 (Token-Deep-Link) ist bereits implementiert (`PROVIDER_CREATE_TOKEN_URLS` in `shared/src/constants/providers.ts:32`, `tokenCreateUrlFor()` in `ProviderRow/index.tsx:54`) — hier bleibt nur Test-Absicherung. `TerminalSettings.profile`/`.customCommand` existieren in TS und Rust; `open_at` nutzt `custom_command` bereits, aber `terminal_spawn_plan` **ignoriert** `_profile` (`terminal.rs:150`).

---

### Task 1: Shared — `TerminalDetection`-Type, Command-Namen, profile-fähige IDs

**Files:**

- Modify: `shared/src/constants/commands.ts`
- Modify: `shared/src/constants/terminal.ts` (Datei zuerst lesen — enthält `TERMINAL_IDS`/`TERMINAL_DEFINITIONS`)
- Create: `shared/src/types/terminalDetection.ts`
- Modify: `shared/src/index.ts` (Re-Exports)

- [ ] **Step 1: Command-Namen**

In `TauriCommand` (alphabetisch einsortieren):

```ts
  DETECT_SHELLS: "detect_shells",
  DETECT_TERMINALS: "detect_terminals",
```

- [ ] **Step 2: Profile-fähige IDs als Constant**

In `shared/src/constants/terminal.ts`:

```ts
/** Terminals whose CLI accepts a named profile (Plan 04/02 §D.1). The Rust
 *  spawn planner and the Settings UI both key off this list — keep the flag
 *  mapping in `app/src-tauri/src/commands/terminal.rs` in sync. */
export const PROFILE_CAPABLE_TERMINAL_IDS = [
  "windows-terminal", // wt.exe -p <profile>
  "gnome-terminal", // --window-with-profile=<profile>
  "konsole", // --profile <profile>
] as const satisfies readonly TerminalId[];
```

- [ ] **Step 3: Detection-DTO**

```ts
// shared/src/types/terminalDetection.ts
import type { ShellId, TerminalId } from "../constants/terminal.js";

/** Result of the OS probe for one terminal emulator. */
export interface TerminalDetection {
  id: TerminalId;
  available: boolean;
  /** Reserved for a later `--version` probe; currently always null. */
  version: string | null;
}

export interface ShellDetection {
  id: ShellId;
  available: boolean;
}
```

Hinweis: liegen `ShellId`-Typen woanders (z. B. `shells.ts`), Import-Pfad anpassen — `rg "ShellId" shared/src` zeigt die Quelle.

- [ ] **Step 4: Build + Typecheck**

Run: `yarn workspace @recrest/shared build && yarn test:ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/src
git commit -m "feat: add terminal detection types and profile-capable id list to shared"
```

---

### Task 2: Rust — `detect_terminals` / `detect_shells` mit injizierbarer Probe

**Files:**

- Modify: `app/src-tauri/src/commands/terminal.rs`
- Modify: `app/src-tauri/src/lib.rs` — beide `generate_handler!`-Blöcke
- Test: inline `#[cfg(test)]` in `terminal.rs`

- [ ] **Step 1: Failing Tests**

Ans bestehende `mod tests` in `terminal.rs` anhängen:

```rust
    #[test]
    fn detect_none_installed() {
        let probe = |_: &str| false;
        let out = detect_terminals_with(&["kitty", "alacritty"], probe);
        assert!(out.iter().all(|d| !d.available));
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn detect_one_installed() {
        let probe = |bin: &str| bin == "kitty";
        let out = detect_terminals_with(&["kitty", "alacritty"], probe);
        assert!(out.iter().find(|d| d.id == "kitty").unwrap().available);
        assert!(!out.iter().find(|d| d.id == "alacritty").unwrap().available);
    }

    #[test]
    fn detect_all_installed() {
        let probe = |_: &str| true;
        let out = detect_terminals_with(&["kitty", "alacritty", "wezterm"], probe);
        assert!(out.iter().all(|d| d.available));
    }
```

- [ ] **Step 2: Run — COMPILE ERROR**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal`
Expected: FAIL (`detect_terminals_with` not found)

- [ ] **Step 3: Implementierung**

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalDetectionDto {
    pub id: String,
    pub available: bool,
    pub version: Option<String>,
}

/// All terminal ids the spawn planner understands, per current OS. Mirrors
/// the `platforms` filter in `shared/src/constants/terminal.ts`.
fn detectable_terminal_ids() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &["apple-terminal", "iterm2", "warp", "wezterm", "kitty", "alacritty", "ghostty", "hyper"]
    }
    #[cfg(target_os = "windows")]
    {
        &["windows-terminal", "powershell", "cmd", "wezterm", "alacritty", "hyper"]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &["kitty", "alacritty", "wezterm", "ghostty", "gnome-terminal", "konsole", "tilix", "xterm", "hyper"]
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        &[]
    }
}

/// Testable core: probes each candidate via the program its spawn plan would
/// invoke (`open`-wrapped macOS apps probe the app bundle instead).
pub fn detect_terminals_with(
    candidates: &[&str],
    probe: impl Fn(&str) -> bool,
) -> Vec<TerminalDetectionDto> {
    candidates
        .iter()
        .map(|id| {
            let available = match terminal_spawn_plan(id, None, Path::new("/")) {
                Ok(plan) if plan.program == "open" => probe_macos_app(id),
                Ok(plan) => probe(&plan.program),
                Err(_) => false,
            };
            TerminalDetectionDto { id: (*id).to_string(), available, version: None }
        })
        .collect()
}

/// `open -a <App>`-based ids can't be probed via PATH — check the bundle dirs.
fn probe_macos_app(id: &str) -> bool {
    let apps: &[&str] = match id {
        "apple-terminal" => &[
            "/System/Applications/Utilities/Terminal.app",
            "/Applications/Utilities/Terminal.app",
        ],
        "iterm2" => &["/Applications/iTerm.app"],
        "warp" => &["/Applications/Warp.app"],
        _ => return false,
    };
    apps.iter().any(|p| Path::new(p).exists())
}

#[tauri::command]
pub fn detect_terminals() -> Vec<TerminalDetectionDto> {
    detect_terminals_with(detectable_terminal_ids(), binary_on_path)
}
```

**`cmd`/`powershell` Sonderfall:** `cmd.exe` existiert auf Windows immer — `binary_on_path("cmd.exe")` via `where` liefert true, kein Sonderfall nötig.

**`detect_shells`:** Es existiert bereits Shell-Detection im Backend (laut Audit; `rg "shell" app/src-tauri/src --type rust -l` zeigt das Modul). Falls dort eine probe-bare Liste existiert, analoges `detect_shells_with` + `#[tauri::command] detect_shells()` daneben legen (DTO `ShellDetectionDto { id, available }`); falls nicht, `which`/`where`-Probe über die Shell-Binaries (`zsh`, `bash`, `fish`, `pwsh`, `powershell.exe`, `cmd.exe`, Git-Bash via `C:\Program Files\Git\bin\bash.exe`-Existenz) mit demselben injizierbaren Muster.

- [ ] **Step 4: Run — PASS**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal`
Expected: PASS (bestehende + 3 neue Tests)

- [ ] **Step 5: In beide `generate_handler!`-Blöcke in `lib.rs` eintragen** (`detect_terminals`, `detect_shells`)

- [ ] **Step 6: Commit**

```bash
git add app/src-tauri/src/commands/terminal.rs app/src-tauri/src/lib.rs
git commit -m "feat: add detect_terminals and detect_shells ipc commands"
```

---

### Task 3: Rust — `terminal_spawn_plan` honoriert das Profil

**Files:**

- Modify: `app/src-tauri/src/commands/terminal.rs` — `terminal_spawn_plan` (Zeile ~150, Parameter `_profile`)
- Test: inline `#[cfg(test)]`

- [ ] **Step 1: Failing Tests**

```rust
    fn plan_with_profile(id: &str, profile: &str) -> TerminalSpawn {
        terminal_spawn_plan(id, Some(profile), Path::new("/work/my repo")).expect("plan")
    }

    #[test]
    fn wt_inserts_profile_flag_before_directory() {
        let p = plan_with_profile("windows-terminal", "Ubuntu");
        assert_eq!(p.program, "wt.exe");
        assert_eq!(
            p.args,
            vec!["-p".to_string(), "Ubuntu".to_string(), "-d".to_string(), "/work/my repo".to_string()]
        );
    }

    #[test]
    fn gnome_terminal_uses_window_with_profile() {
        let p = plan_with_profile("gnome-terminal", "Dev");
        assert!(p.args.contains(&"--window-with-profile=Dev".to_string()));
        assert!(p.args.contains(&"--working-directory=/work/my repo".to_string()));
    }

    #[test]
    fn konsole_appends_profile_flag() {
        let p = plan_with_profile("konsole", "Dev");
        assert_eq!(
            p.args,
            vec!["--profile".to_string(), "Dev".to_string(), "--workdir".to_string(), "/work/my repo".to_string()]
        );
    }

    #[test]
    fn profile_is_ignored_for_incapable_terminals() {
        let with = plan_with_profile("kitty", "Dev");
        let without = plan("kitty");
        assert_eq!(with, without);
    }

    #[test]
    fn empty_profile_is_treated_as_none() {
        let with = plan_with_profile("windows-terminal", "  ");
        let without = plan("windows-terminal");
        assert_eq!(with, without);
    }
```

- [ ] **Step 2: Run — FAIL**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal`
Expected: FAIL (Profil-Tests rot, Bestand grün)

- [ ] **Step 3: Implementierung**

In `terminal_spawn_plan` den Parameter `_profile` → `profile` umbenennen und vor dem `match` normalisieren, danach die drei Arme erweitern:

```rust
pub fn terminal_spawn_plan(
    id: &str,
    profile: Option<&str>,
    path: &Path,
) -> Result<TerminalSpawn, CommandError> {
    let p = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;
    // Whitespace-only profiles come from a cleared-but-saved input field.
    let profile = profile.map(str::trim).filter(|s| !s.is_empty());

    let plan = match id {
        // ... bestehende Arme unverändert, außer:
        "windows-terminal" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.extend(["-p".into(), pr.into()]);
            }
            args.extend(["-d".into(), p.into()]);
            TerminalSpawn { program: "wt.exe".into(), args, cwd: None }
        }
        "gnome-terminal" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.push(format!("--window-with-profile={pr}"));
            }
            args.push(format!("--working-directory={p}"));
            TerminalSpawn { program: "gnome-terminal".into(), args, cwd: None }
        }
        "konsole" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.extend(["--profile".into(), pr.into()]);
            }
            args.extend(["--workdir".into(), p.into()]);
            TerminalSpawn { program: "konsole".into(), args, cwd: None }
        }
        // ... Rest unverändert
    };
    Ok(plan)
}
```

Die Flag-Zuordnung muss exakt `PROFILE_CAPABLE_TERMINAL_IDS` aus Task 1 spiegeln — Kommentar mit Querverweis an beide Stellen.

- [ ] **Step 4: Run — PASS**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal`
Expected: PASS (alle)

- [ ] **Step 5: Commit**

```bash
git add app/src-tauri/src/commands/terminal.rs
git commit -m "feat: honor terminal profile in spawn plans"
```

---

### Task 4: Settings-Store — Detection-Thunks + State

**Files:**

- Modify: `app/src/store/actions/settings.actions.ts`
- Modify: `app/src/store/reducers/settingsReducer.ts`
- Modify: `app/src/store/types/settings.types.ts`
- Test: ggf. bestehende Settings-Reducer-Tests erweitern (Plan 04/03 legt sie an — hier nur die neuen Cases, falls die Datei schon existiert)

- [ ] **Step 1: State-Felder**

In `settings.types.ts` (`SettingsState`):

```ts
  /** OS-probe results; `null` until `loadDetectedTerminals` resolved.
   *  Outside Tauri this stays `null` and the UI falls back to stub maps. */
  detectedTerminals: TerminalDetection[] | null;
  detectedShells: ShellDetection[] | null;
```

- [ ] **Step 2: Thunks**

In `settings.actions.ts`:

```ts
export const loadDetectedTerminals = createAsyncThunk<TerminalDetection[]>(
  "settings/detectTerminals",
  async () => invoke<TerminalDetection[]>(TauriCommand.DETECT_TERMINALS),
);

export const loadDetectedShells = createAsyncThunk<ShellDetection[]>(
  "settings/detectShells",
  async () => invoke<ShellDetection[]>(TauriCommand.DETECT_SHELLS),
);
```

- [ ] **Step 3: Reducer-Cases**

```ts
    .addCase(loadDetectedTerminals.fulfilled, (state, action) => {
      state.detectedTerminals = action.payload;
    })
    .addCase(loadDetectedShells.fulfilled, (state, action) => {
      state.detectedShells = action.payload;
    })
```

`initialState` um `detectedTerminals: null, detectedShells: null` ergänzen. Rejected-Fall: bewusst kein Error-Banner — Detection-Ausfall degradiert still zum Stub (Kommentar an den Reducer).

- [ ] **Step 4: Typecheck**

Run: `yarn test:ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store
git commit -m "feat: add terminal and shell detection thunks to settings store"
```

---

### Task 5: `SystemSection` — IPC-Detection + Profile-Input + Custom-Command

**Files:**

- Modify: `app/src/pages/app/Settings/components/GeneralTab/sections/SystemSection/index.tsx`
- Modify: `app/src/lib/constants/testIds.constants.ts` — `settings.general.terminalProfileInput`, `settings.general.terminalCustomCommandInput`
- Modify: `app/src/i18n/locales/{en,de}/settings.json`
- Test: `app/src/pages/app/Settings/components/GeneralTab/sections/SystemSection/SystemSection.test.tsx` (falls vorhanden erweitern, sonst anlegen)

- [ ] **Step 1: i18n-Keys**

en (`settings.json`, in den bestehenden `terminal`-Block):

```json
"profile_label": "Terminal profile",
"profile_hint": "Profile name passed to the terminal (e.g. wt.exe -p).",
"custom_command_label": "Custom command",
"custom_command_hint": "Full command to run; the repo path is the working directory."
```

de analog: `"Terminal-Profil"`, `"Profilname, der ans Terminal übergeben wird (z. B. wt.exe -p)."`, `"Eigener Befehl"`, `"Vollständiger Befehl; der Repo-Pfad ist das Arbeitsverzeichnis."`.

- [ ] **Step 2: Failing Component-Tests (nur `data-testid`)**

```tsx
// SystemSection.test.tsx — Render-Helper mit Redux-Provider + MemoryRouter
// (future-Flags v7_startTransition/v7_relativeSplatPath) aus bestehenden
// Settings-Tests übernehmen (`rg -l "GeneralTab" app/src --glob "*.test.tsx"`).

it("shows the profile input only for profile-capable terminals", () => {
  renderWithTerminal("windows-terminal");
  expect(screen.getByTestId(TEST_IDS.settings.general.terminalProfileInput)).toBeInTheDocument();
});

it("hides the profile input for incapable terminals", () => {
  renderWithTerminal("kitty");
  expect(
    screen.queryByTestId(TEST_IDS.settings.general.terminalProfileInput),
  ).not.toBeInTheDocument();
});

it("shows the custom command field only when custom command mode is active", () => {
  renderWithTerminal("custom");
  expect(
    screen.getByTestId(TEST_IDS.settings.general.terminalCustomCommandInput),
  ).toBeInTheDocument();
});
```

`renderWithTerminal(id)` preloaded den Store mit `settings.backend.terminal.id = id`.

- [ ] **Step 3: Run — FAIL**, dann implementieren\*\*

Umbau in `SystemSection`:

1. **Detection laden:**

```tsx
useEffect(() => {
  if (!isTauri()) return; // web dev: stub maps below stay authoritative
  void dispatch(loadDetectedTerminals());
  void dispatch(loadDetectedShells());
}, [dispatch]);

const detected = useAppSelector((s) => s.settings.detectedTerminals);
const detectedTerminals = new Set<TerminalId>(
  detected
    ? detected.filter((d) => d.available).map((d) => d.id)
    : DETECTED_TERMINALS_BY_PLATFORM[platform],
);
```

Analog für Shells. Die Stub-Maps bleiben als Web-Fallback in der Datei (Kommentar aktualisieren: jetzt ausschließlich `yarn dev:web`-Fallback).

2. **Custom-Eintrag im Terminal-Select:** zusätzlicher `MenuItem value="custom"` unterhalb der installierten Terminals (Label `t("settings.terminal.custom_command_label")`). Persistiert als `terminal.id = "custom"`. **Wichtig:** `open_at` in Rust behandelt `custom_command` bereits unabhängig von `id` — beim Speichern von `id = "custom"` ohne `customCommand` zeigt das Feld einen Hint; Rust-seitig ist kein neuer Spawn-Arm nötig (Custom-Pfad greift vor der Id-Auflösung).

3. **Profile-Input** (eigene `SettingsRow`, nur sichtbar wenn `PROFILE_CAPABLE_TERMINAL_IDS.includes(defaultTerminal)`):

```tsx
{
  isProfileCapable && (
    <SettingsRow
      label={t("settings.terminal.profile_label")}
      sub={t("settings.terminal.profile_hint")}
    >
      <NumberInput // bestehendes styled-input-Pattern kopieren → eigenes `TextInput`-styled mit width 260
        type="text"
        defaultValue={backend?.terminal?.profile ?? ""}
        onBlur={(e) =>
          persist({
            terminal: {
              id: backend?.terminal?.id ?? null,
              profile: e.target.value.trim() || null,
              customCommand: backend?.terminal?.customCommand ?? null,
            },
          })
        }
        data-testid={TEST_IDS.settings.general.terminalProfileInput}
      />
    </SettingsRow>
  );
}
```

4. **Custom-Command-Feld** (nur bei `defaultTerminal === "custom"`), gleiche Persist-Mechanik auf `customCommand`.

- [ ] **Step 4: Run — PASS**

Run: `yarn workspace @recrest/app test src/pages/app/Settings/components/GeneralTab/sections/SystemSection`
Expected: PASS (3+ Tests)

- [ ] **Step 5: Lint + Typecheck**

Run: `yarn test:ts && yarn lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/app/Settings app/src/lib/constants app/src/i18n
git commit -m "feat: wire terminal detection ipc with profile and custom command inputs"
```

---

### Task 6: D.2-Verifikation — Token-Deep-Link Component-Tests

**Files:**

- Test: `app/src/pages/app/Settings/components/AccountsTab/parts/ProviderRow/ProviderRow.test.tsx` (falls vorhanden erweitern, sonst anlegen)

**Kontext:** Die Implementierung existiert (`tokenCreateUrlFor()` in `ProviderRow/index.tsx:54-68`, URLs in `shared/src/constants/providers.ts:32-37` inkl. Self-hosted-GitLab-Ableitung). Es fehlen Tests.

- [ ] **Step 1: Implementierung lesen** — `ProviderRow/index.tsx` komplett, insbesondere wie `openExternal` aufgerufen wird und welcher `data-testid` auf dem Link liegt (fehlt einer → Constant + testid ergänzen, das ist Teil dieser Task).

- [ ] **Step 2: Failing Tests**

```tsx
import { PROVIDER_CREATE_TOKEN_URLS } from "@recrest/shared";

import * as tauri from "@/lib/tauri";

// openExternal mocken (Modul-Mock-Pattern aus bestehenden Tests übernehmen):
vi.spyOn(tauri, "openExternal").mockResolvedValue(undefined);

it.each(["github", "gitlab", "bitbucket"] as const)(
  "renders the token creation link for %s and opens it externally",
  (provider) => {
    renderProviderRow(provider); // Helper analog zu bestehenden AccountsTab-Tests
    const link = screen.getByTestId(TEST_IDS.settings.accounts.tokenCreateLink);
    fireEvent.click(link);
    expect(tauri.openExternal).toHaveBeenCalledWith(PROVIDER_CREATE_TOKEN_URLS[provider]);
  },
);

it("derives the self-hosted gitlab token url from the connection base url", () => {
  renderProviderRow("gitlab", { baseUrl: "https://git.example.com" });
  fireEvent.click(screen.getByTestId(TEST_IDS.settings.accounts.tokenCreateLink));
  expect(tauri.openExternal).toHaveBeenCalledWith(
    expect.stringContaining("https://git.example.com"),
  );
});
```

Die exakte Self-hosted-URL-Assertion an die reale `tokenCreateUrlFor()`-Logik anpassen (Step 1).

- [ ] **Step 3: Run — FAIL → ggf. testid ergänzen → PASS**

Run: `yarn workspace @recrest/app test src/pages/app/Settings/components/AccountsTab/parts/ProviderRow`
Expected: PASS (4 Tests)

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/app/Settings app/src/lib/constants
git commit -m "test: cover provider token creation deep links"
```

---

### Task 7: Abschluss-Verifikation

- [ ] **Step 1: Volle Checks**

```bash
yarn typecheck && yarn lint
yarn workspace @recrest/app test src/pages/app/Settings src/store
cargo test --manifest-path app/src-tauri/Cargo.toml
```

Expected: alles PASS.

- [ ] **Step 2: Manuelle Smokes (volles Tauri, `yarn dev`)**

- Settings → General: Terminal-Dropdown zeigt echte Detection (auf Windows: `wt`/`pwsh`/`cmd` available, nicht-installierte ausgegraut).
- Terminal auf `windows-terminal` + Profil setzen → RepoRow "Open in terminal" → Windows Terminal öffnet mit dem Profil.
- Terminal auf `custom` + z. B. `wt.exe -d {pfad ist cwd}` → Custom-Spawn funktioniert.
- Profil-Input erscheint **nur** bei wt/gnome-terminal/konsole; Custom-Feld **nur** bei `custom`.
- Settings → Accounts: Token-Link pro Provider öffnet die richtige Seite im System-Browser.
