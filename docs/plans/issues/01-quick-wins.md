# Phase 1 — Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sechs niedrig hängende Bugs behoben (Plural-String, Akzent-Label, hardcoded macOS-Version, Branch-Icon-Höhe, „Storage"-Sektion umbenannt, „Im Ordner öffnen"-Pfad).

**Architecture:** Reine kleine Fixes — Locale-Strings, ein neuer Tauri-Command für System-Facts, ein Styles-Fix, ein Pfad-Fix. Keine neuen Abstraktionen.

**Tech Stack:** React 19 + MUI v9 + i18next 23, Tauri v2, Rust stdlib.

---

## File Structure

- Modify: `app/src/locales/de/onboarding.json`, `app/src/locales/en/onboarding.json` (Plural-Schema)
- Modify: `app/src/components/organisms/onboarding/steps/InitialScanStep/index.tsx` (Plural-Komposition)
- Modify: `app/src/locales/de/settings.json`, `app/src/locales/en/settings.json` (Coral-Label, Storage-Rename, storage_facts-Removal)
- Create: `app/src-tauri/src/commands/system.rs` (oder ergänzen falls existiert) — `get_system_facts`
- Modify: `app/src-tauri/src/lib.rs` (Command-Registrierung)
- Create: `shared/src/types/system.ts` — SystemFacts-DTO
- Create: `app/src/components/molecules/SystemInfoCard/index.tsx` — neue Settings-Sektion
- Modify: `app/src/pages/app/Settings/index.tsx` — neue Sektion einbinden, „Storage"-Sektion umbenennen
- Modify: `app/src/pages/app/Branches/parts/BranchRowItem/index.tsx` (Icon-Box)
- Modify: `app/src-tauri/src/commands/repos.rs` — `open_folder` öffnet Repo-Pfad statt Parent

---

## Task 1: Plural-Fix „1 Ordnern" → „1 Ordner"

**Files:**

- Modify: `app/src/locales/de/onboarding.json:64-65`, `app/src/locales/en/onboarding.json` analog
- Modify: `app/src/components/organisms/onboarding/steps/InitialScanStep/index.tsx`

- [x] **Step 1: Test schreiben — Plural-Komposition stimmt für 1 Ordner**

```tsx
// app/src/components/organisms/onboarding/steps/InitialScanStep/InitialScanStep.test.tsx
import { renderWithI18n } from "@/test/renderWithI18n";

import { InitialScanStep } from ".";

it("zeigt '1 Repository in 1 Ordner' bei singulärem Count", () => {
  const { getByText } = renderWithI18n(
    <InitialScanStep result={{ repositories: 1, pathCount: 1 }} />,
  );
  expect(getByText(/1 Repository in 1 Ordner gefunden\./)).toBeInTheDocument();
});

it("zeigt '8 Repositories in 1 Ordner' bei pluralem Count + singulärem Path", () => {
  const { getByText } = renderWithI18n(
    <InitialScanStep result={{ repositories: 8, pathCount: 1 }} />,
  );
  expect(getByText(/8 Repositories in 1 Ordner gefunden\./)).toBeInTheDocument();
});
```

- [x] **Step 2: Test laufen lassen → fehlschlägt**

Run: `yarn workspace @recrest/app test InitialScanStep`
Expected: FAIL — aktueller String zeigt „1 Ordnern".

- [x] **Step 3: Locale-Schlüssel aufsplitten**

```json
// app/src/locales/de/onboarding.json — ersetze summary_one / summary_other durch:
"repos_count_one": "{{count}} Repository",
"repos_count_other": "{{count}} Repositories",
"paths_count_one": "{{count}} Ordner",
"paths_count_other": "{{count}} Ordnern",
"summary_template": "{{repos}} in {{paths}} gefunden."
```

(EN analog: `repos_count_one: "{{count}} repository"`, etc.)

- [x] **Step 4: Komposition im Component**

```tsx
const repos = t("repos_count", { count: result.repositories });
const paths = t("paths_count", { count: result.pathCount });
const summary = t("summary_template", { repos, paths });
```

- [x] **Step 5: Tests grün**

Run: `yarn workspace @recrest/app test InitialScanStep`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add app/src/locales app/src/components/organisms/onboarding/steps/InitialScanStep
git commit -m "fix(i18n): split onboarding summary plural into independent count keys"
```

---

## Task 2: Akzent-Label „Coral" → „Coral Orange"

**Files:**

- Modify: `app/src/locales/en/settings.json:68` (`accent.coral`)
- Modify: `app/src/locales/de/settings.json:68` analog

- [x] **Step 1: Werte ändern**

EN: `"coral": "Coral Orange"`
DE: `"coral": "Korallenorange"`

- [x] **Step 2: Typecheck**

Run: `yarn test:ts`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add app/src/locales
git commit -m "fix(settings): label accent color 'Coral Orange' instead of 'Coral'"
```

---

## Task 3: Hardcoded macOS 15 raus aus „Speicher" → eigene System-Sektion

**Files:**

- Create: `app/src-tauri/src/commands/system.rs`
- Modify: `app/src-tauri/src/lib.rs`
- Create: `shared/src/types/system.ts`
- Modify: `shared/src/index.ts` (Re-export)
- Create: `app/src/components/molecules/SystemInfoCard/index.tsx`
- Modify: `app/src/pages/app/Settings/index.tsx`
- Modify: `app/src/locales/{de,en}/settings.json` (`storage_facts` entfernen, neue `system_section` hinzufügen)

- [x] **Step 1: Test für SystemFacts-DTO schreiben**

```rust
// app/src-tauri/src/commands/system.rs
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn get_system_facts_returns_non_empty_values() {
        let facts = get_system_facts_impl();
        assert!(!facts.os.is_empty());
        assert!(!facts.arch.is_empty());
    }
}
```

- [x] **Step 2: Command implementieren**

```rust
use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemFacts {
    pub os: String,
    pub arch: String,
    pub os_version: Option<String>,
    pub git_version: Option<String>,
    pub app_version: String,
}

pub fn get_system_facts_impl() -> SystemFacts {
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let git_version = Command::new("git")
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().replace("git version ", ""));
    SystemFacts {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        os_version: os_info::get().version().to_string().into(),
        git_version,
        app_version,
    }
}

#[tauri::command]
pub fn get_system_facts() -> SystemFacts {
    get_system_facts_impl()
}
```

`os_info` crate hinzufügen: `cd app/src-tauri && cargo add os_info`

- [x] **Step 3: Command in `lib.rs` registrieren**

In `app/src-tauri/src/lib.rs::run()` zu `tauri::generate_handler![...]` hinzufügen:

```rust
commands::system::get_system_facts,
```

- [x] **Step 4: DTO + Re-Export im shared package**

```ts
// shared/src/types/system.ts
export interface SystemFacts {
  os: string;
  arch: string;
  osVersion?: string;
  gitVersion?: string;
  appVersion: string;
}
```

In `shared/src/index.ts`: `export type { SystemFacts } from "./types/system";`

Run: `yarn workspace @recrest/shared build`

- [x] **Step 5: Component `SystemInfoCard`**

```tsx
// app/src/components/molecules/SystemInfoCard/index.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SystemFacts } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";

export function SystemInfoCard() {
  const { t } = useTranslation("settings");
  const [facts, setFacts] = useState<SystemFacts | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    invoke<SystemFacts>("get_system_facts")
      .then(setFacts)
      .catch(() => {});
  }, []);
  if (!facts) return null;
  return (
    <dl>
      <dt>{t("system.os")}</dt>
      <dd>{`${facts.os} ${facts.osVersion ?? ""} (${facts.arch})`}</dd>
      <dt>{t("system.git")}</dt>
      <dd>{facts.gitVersion ?? "—"}</dd>
      <dt>{t("system.app")}</dt>
      <dd>{facts.appVersion}</dd>
    </dl>
  );
}
```

- [x] **Step 6: Settings-Page bindet neue Sektion ein**

In `app/src/pages/app/Settings/index.tsx`: neue Sektion „System" zwischen Diagnose und (umbenanntem) „Daten & Cache" einfügen.

- [x] **Step 7: Alte storage_facts-Schlüssel entfernen + neue Sektion-Labels hinzufügen**

```json
// app/src/locales/de/settings.json — storage_facts-Block komplett löschen, dazu:
"system": {
  "title": "System",
  "os": "Betriebssystem",
  "git": "Git",
  "app": "Recrest-Version"
}
```

EN analog mit englischen Labels.

- [x] **Step 8: Typecheck + Tests grün**

Run: `yarn test:ts && yarn workspace @recrest/app test SystemInfoCard`
Expected: PASS

- [x] **Step 9: Commit**

```bash
git add app/src-tauri app/src shared
git commit -m "feat(settings): live system facts via get_system_facts, drop hardcoded macOS 15"
```

---

## Task 4: Branch-Icon-Höhe inkonsistent

**Files:**

- Modify: `app/src/pages/app/Branches/parts/BranchRowItem/index.tsx`
- Falls Styles separat: ergänzende Datei `BranchRowItem.styles.tsx`

- [x] **Step 1: Styled-Box für Icon-Slot**

Ergänze/fixe in der Component:

```tsx
const IconSlot = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: 18,
  height: 18,
});
```

Icon-JSX wird in `<IconSlot>{icon}</IconSlot>` gewrappt.

- [x] **Step 2: Playwright-Visual-Check**

Run: `yarn dev:web` und Browser zu `/branches` navigieren. Alle Icons sollten visuell auf derselben Baseline sitzen.
(Memory: `feedback_verify_ui_with_playwright`.)

- [x] **Step 3: Commit**

```bash
git add app/src/pages/app/Branches
git commit -m "fix(branches): unify icon slot height in branch row"
```

---

## Task 5: Settings-Sektion „Storage" → „Daten & Cache" / „Data & Cache"

**Files:**

- Modify: `app/src/locales/{de,en}/settings.json` (`sections.storage`)
- ggf. Constant in `app/src/lib/constants/settings.constants.ts`

- [x] **Step 1: Locale-Schlüssel-Wert ändern**

DE: `"storage": "Daten & Cache"`
EN: `"storage": "Data & Cache"`

- [x] **Step 2: Test mit Settings-Page rendern und Sektions-Header prüfen**

Run: `yarn workspace @recrest/app test Settings`
Expected: PASS — alle existierenden Tests greifen auf den Key `sections.storage` zu, der unverändert bleibt.

- [x] **Step 3: Commit**

```bash
git add app/src/locales app/src/lib/constants
git commit -m "fix(settings): rename Storage section to Data & Cache"
```

---

## Task 6: „Im Ordner öffnen" öffnet Repo-Pfad statt Parent

**Files:**

- Modify: `app/src-tauri/src/commands/repos.rs::open_folder`

- [x] **Step 1: Aktuelle Implementierung finden**

Run: `grep -n "open_folder\|reveal_in_finder\|parent()" app/src-tauri/src/commands/repos.rs`

- [x] **Step 2: Test schreiben (Rust-Unit-Test, mock path)**

```rust
#[test]
fn open_folder_targets_repo_path_not_parent() {
    let repo = PathBuf::from("/tmp/recrest-test-repo");
    let target = resolve_open_folder_target(&repo);
    assert_eq!(target, repo);
}
```

- [x] **Step 3: Implementation fixen**

`open_folder` ruft `opener::open_path(repo_path)` (oder `tauri_plugin_opener::open_path`) **direkt mit dem Repo-Pfad** auf, ohne `.parent()`.

- [x] **Step 4: Manueller Smoke-Test**

In `yarn dev` (Tauri) ein Repo aus der Liste „Im Ordner öffnen" → Finder/Explorer zeigt den Repo-Inhalt, nicht den Parent.

- [x] **Step 5: Commit**

```bash
git add app/src-tauri/src/commands/repos.rs
git commit -m "fix(repos): open_folder reveals the repo path itself, not its parent"
```

---

## Verification

- [x] **Full typecheck:** `yarn test:ts`
- [x] **Full lint:** `yarn lint`
- [x] **App-Build smoke:** `yarn workspace @recrest/app build`
- [x] **Manueller End-to-End-Pass** in `yarn dev`:
  - Onboarding bis zum Scan-Result öffnen, beide Plural-Varianten (1 + N) visuell prüfen
  - Settings → Akzentfarbe: „Coral Orange"-Label sichtbar
  - Settings → neue „System"-Sektion: zeigt echte Werte
  - Settings → „Daten & Cache"-Header
  - Branches-Page: Icons auf gleicher Baseline
  - „Im Ordner öffnen" zeigt Repo-Inhalt
