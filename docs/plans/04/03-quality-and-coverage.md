# Plan 04/03 — Test-Suite-Ausbau & Coverage-Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducer-, Lib-, Rust- und E2E-Test-Lücken schließen und am Ende ein hartes Vitest-Coverage-Gate von 60% Lines / 50% Branches setzen.

**Architecture:** Coverage-Tooling zuerst (Messen vor Raten), dann Tests von innen nach außen: Reducer → Lib-Module → Rust-Backend → E2E-Critical-Paths. Das Gate kommt als letzte Task, gesetzt auf 60/50 — liegt der real erreichte Wert darunter, wird auf `Ist − 2%` gegated und ein Follow-up in `docs/plans/future.md` notiert (Entscheidung Brainstorming 2026-06-03).

**Tech Stack:** Vitest + `@vitest/coverage-v8`, Redux Toolkit Action-Creators, Rust `cargo test` mit `tempfile`-Tmp-Repos, Playwright (`PW_HEADLESS=1`).

**Stand-Korrektur gegenüber Eltern-Plan (Audit 2026-06-03):** Es existieren **keine** Reducer-Tests unter `app/src/store/` (der Eltern-Plan nahm `uiReducer.test.ts` + `reposReducer.test.ts` als vorhanden an). Alle sieben Reducer brauchen Tests. `activityReducer.test.ts` entsteht in Plan 04/01 Task 6 — hier nicht doppeln.

**Konventionen (bindend):** Tests in Englisch; Component-Tests selektieren ausschließlich über `data-testid` (aus Constants, nie inline); nach Edits nur gezielte Vitest-Filter laufen lassen, nie die ungefilterte Suite; E2E lokal mit `PW_HEADLESS=1`.

**Abhängigkeit:** Plan 04/01 sollte gemerged sein (liefert `activitySlice`, `insights.ts`, parametrisierte `activityStats`); die Tasks 1–5 hier funktionieren aber auch ohne.

---

### Task 1: Coverage-Tooling + Baseline-Messung

**Files:**

- Modify: `app/package.json` (devDependency + Script)
- Modify: `app/vitest.config.ts`

- [ ] **Step 1: Dependency + Script**

```bash
yarn workspace @recrest/app add -D @vitest/coverage-v8
```

In `app/package.json` `scripts`: `"test:coverage": "vitest run --coverage"`.

- [ ] **Step 2: Coverage-Block in `vitest.config.ts`** (noch OHNE Thresholds — die kommen in Task 6)

```ts
  test: {
    // ... bestehende Felder unverändert ...
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/i18n/locales/**",
        "src/assets/**",
        "src/**/*.styles.tsx",
        "src/main.tsx",
      ],
    },
  },
```

- [ ] **Step 3: Baseline messen und festhalten**

Run: `yarn workspace @recrest/app test:coverage`
Expected: Läuft durch; Lines/Branches-Prozentwerte aus der Summary **in der PR-Beschreibung notieren** (Referenzpunkt für Task 6).

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/vitest.config.ts yarn.lock
git commit -m "chore: add vitest coverage tooling"
```

---

### Task 2: Reducer-Tests für alle sechs Bestands-Slices

**Files:**

- Create: `app/src/store/reducers/uiReducer.test.ts`
- Create: `app/src/store/reducers/settingsReducer.test.ts`
- Create: `app/src/store/reducers/providersReducer.test.ts`
- Create: `app/src/store/reducers/reposReducer.test.ts`
- Create: `app/src/store/reducers/prsReducer.test.ts`
- Create: `app/src/store/reducers/remoteImportReducer.test.ts`

**Pattern (für alle sechs identisch):** Reducer pur testen — echte Action-Creators aus `store/actions/*.actions.ts` dispatchen, **kein** Store, **kein** `invoke`-Mock nötig: Async-Thunks werden über ihre generierten Sub-Actions getestet (`thunk.pending(requestId, arg)`, `thunk.fulfilled(payload, requestId, arg)`, `thunk.rejected(error, requestId, arg)`).

**Abdeckungs-Pflicht pro Reducer:** 1 Test pro Sync-Action + pro Thunk je 1 Test für `pending`/`fulfilled`/`rejected` (mindestens der State-Übergang `loading/error`).

Worked Example (`reposReducer.test.ts`) — als Vorlage für die anderen fünf:

```ts
// app/src/store/reducers/reposReducer.test.ts
import { describe, expect, it } from "vitest";

import type { Repository } from "@recrest/shared";

import {
  loadRepos,
  scanForRepos,
  setGroups,
  setScanPaths,
  upsertRepo,
} from "@/store/actions/repos.actions";
import { reposReducer } from "@/store/reducers/reposReducer";

const repo = (id: string): Repository =>
  ({ id, name: `repo-${id}`, path: `/repos/${id}` }) as Repository;

const initial = reposReducer(undefined, { type: "@@init" });

describe("reposReducer", () => {
  it("setScanPaths replaces the path list", () => {
    const next = reposReducer(initial, setScanPaths(["/a", "/b"]));
    expect(next.scanPaths).toEqual(["/a", "/b"]);
  });

  it("upsertRepo inserts and overwrites by id", () => {
    let state = reposReducer(initial, upsertRepo(repo("r1")));
    state = reposReducer(state, upsertRepo({ ...repo("r1"), name: "renamed" }));
    expect(state.items["r1"]?.name).toBe("renamed");
  });

  it("setGroups replaces the group map", () => {
    const next = reposReducer(initial, setGroups({ g1: { id: "g1", name: "G" } as never }));
    expect(Object.keys(next.groups)).toEqual(["g1"]);
  });

  it("scanForRepos.pending sets loading and clears error", () => {
    const next = reposReducer({ ...initial, error: "old" }, scanForRepos.pending("rid", ["/a"]));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("scanForRepos.fulfilled replaces items wholesale", () => {
    const seeded = reposReducer(initial, upsertRepo(repo("stale")));
    const next = reposReducer(seeded, scanForRepos.fulfilled([repo("r1")], "rid", ["/a"]));
    expect(Object.keys(next.items)).toEqual(["r1"]); // stale orphan pruned
    expect(next.loading).toBe(false);
  });

  it("scanForRepos.rejected records the error message", () => {
    const next = reposReducer(initial, scanForRepos.rejected(new Error("boom"), "rid", ["/a"]));
    expect(next.loading).toBe(false);
    expect(next.error).toBe("boom");
  });

  it("loadRepos.fulfilled replaces items", () => {
    const next = reposReducer(initial, loadRepos.fulfilled([repo("r2")], "rid"));
    expect(next.items["r2"]).toBeDefined();
  });
});
```

- [ ] **Step 1: `reposReducer.test.ts` anlegen (Code oben), erweitern um die übrigen Actions** — vorher `reposReducer.ts` + `repos.actions.ts` vollständig lesen und JEDE behandelte Action abdecken (auch `loadSettings.fulfilled`-Mirror, `removeRepo`, `deleteRepo`, Git-Action-Thunks soweit sie State ändern).
- [ ] **Step 2: Run — PASS**: `yarn workspace @recrest/app test src/store/reducers/reposReducer.test.ts`
- [ ] **Step 3: Die übrigen fünf Reducer nach demselben Muster** — je Datei: Reducer + Actions lesen → Case-Liste aufstellen → Tests schreiben → gezielt laufen lassen. Spezifika:
  - `uiReducer`: Theme-/Sidebar-Toggles, `refreshNonce`-Bump, `loadSettings.fulfilled`-Hydration.
  - `settingsReducer`: `setPollingIntervalMinutes`-Clamping (Min/Max aus `POLLING_INTERVAL_*`), `loadSettings`/`saveSettings`-Hydration inkl. `backend`-Payload, Detection-Cases aus Plan 04/02 Task 4 (falls schon gemerged).
  - `providersReducer`: Token set/clear, Connections-Updates, Status-Übergänge pro Provider.
  - `prsReducer`: Items-per-Repo-Ablage, Loading-Flags, Fehlerpfad.
  - `remoteImportReducer`: Wizard-State-Übergänge, Reset.
- [ ] **Step 4: Gesamtlauf der Reducer-Tests**

Run: `yarn workspace @recrest/app test src/store/reducers`
Expected: PASS (6 Dateien + `activityReducer.test.ts` aus Plan 04/01, falls gemerged)

- [ ] **Step 5: Commit**

```bash
git add app/src/store/reducers
git commit -m "test: cover all redux reducers with action-level tests"
```

---

### Task 3: Lib-Sweep — Pure Functions ohne Tests

**Files:**

- Tests neben den jeweiligen Modulen (`<modul>.test.ts`)

- [ ] **Step 1: Lückenliste erzeugen**

Run (Git Bash / `bash`-Tool):

```bash
for f in $(rg -l "^export (function|const)" app/src/lib --type ts | grep -v "\.test\."); do
  t="${f%.ts}.test.ts"; [ -f "$t" ] || echo "MISSING: $f";
done
```

- [ ] **Step 2: Pro gemeldetem Modul Tests schreiben.** Ziel: **80% Lines pro Modul** für `activityStats`, `activityAggregates`, `insights` (aus Plan 04/01), `charts/palette`, `charts/nivoTheme` (aus Plan 04/01), `authorNormalize`, `utils/*`. Prioritäten + Pflicht-Cases:
  - `activityStats`: `computeActivityStats` (leer / eine Woche / zwei Wochen mit Delta), `computeLeaderboard` (Sortierung, Limit, `signatureKey`-Dedup), `computeStackedChart` (Segment-Aggregation, Farb-Stabilität), `daysAgo`-Fensterparameter (Plan 04/01 Task 8), `currentStreak`/`longestStreak` (Lücken-Fälle).
  - `activityAggregates`: `computeTimeToMerge` (alle 4 Buckets), `computeHeatmap` (Mon-first-Konvertierung!), `computeCiPassRate` (`rate = 1` ohne Runs), `computeFlakyRepos` (Limit + Sortierung), `computeReviewQueue` (ageDays, Limit), `computeLanguageMix` (Alias-Bucketing TSX→TypeScript).
  - `charts/palette`: `colorForRepo`-Stabilität (gleiche Id → gleiche Farbe), `buildRepoColorMap` (deterministisch über Sortierung), `fade`/`shade` (Format-Assertions).
  - `utils/*`: jede Datei per Lückenliste; `timeAgo`-artige Funktionen mit `vi.setSystemTime`.
- [ ] **Step 3: Modulweise verifizieren** (nur gezielte Filter!)

Run: `yarn workspace @recrest/app test src/lib --coverage`
Expected: PASS; betroffene Module ≥80% Lines in der Coverage-Summary.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib
git commit -m "test: cover untested lib modules"
```

---

### Task 4: Rust-Backend-Tests (Tmp-Repo-Pattern)

**Files:**

- Create: `app/src-tauri/src/test_support.rs` (`#[cfg(test)]`-Modul, in `lib.rs` einhängen)
- Tests inline in: `git/scanner.rs`, `git/status.rs`, `git/author_normalize.rs` (Bestand prüfen), `commands/git_index.rs`, `commands/git_config.rs`, `auth/token.rs`

- [ ] **Step 1: Gemeinsamen Fixture-Helper extrahieren**

Falls Plan 04/01 Task 4 bereits `fixture_repo` in `repos.rs` angelegt hat, nach `test_support.rs` heben und von dort importieren:

```rust
// app/src-tauri/src/test_support.rs
//! Shared test fixtures. Compiled only for `cargo test`.
#![cfg(test)]

use chrono::{DateTime, Utc};

/// Throwaway repo with one commit per `days_ago` entry at 12:00 UTC.
pub fn fixture_repo(
    days_ago: &[i64],
    anchor: DateTime<Utc>,
) -> (tempfile::TempDir, git2::Repository) {
    // (Implementierung aus Plan 04/01 Task 4 Step 1 übernehmen.)
    todo_use_plan_04_01_implementation()
}

/// Writes `name` with `content` into the working tree and stages it.
pub fn write_and_stage(repo: &git2::Repository, name: &str, content: &str) {
    let root = repo.workdir().expect("workdir");
    std::fs::write(root.join(name), content).expect("write");
    let mut index = repo.index().expect("index");
    index.add_path(std::path::Path::new(name)).expect("add");
    index.write().expect("write index");
}
```

(`todo_use_plan_04_01_implementation` ist hier nur Verweis-Notation — beim Umsetzen den echten Body aus `repos.rs` verschieben, nicht kopieren.)

In `lib.rs`: `#[cfg(test)] mod test_support;`.

- [ ] **Step 2: Pro Modul Happy-Path + 2 Failure-Cases.** Pflicht-Liste:
  - `git/scanner.rs`: findet Repo in Unterordner; `skip_current_dir` verhindert Nested-Repo-Doppelfund (Repo im Repo anlegen); Nicht-Git-Ordner → leeres Ergebnis.
  - `git/status.rs`: cleanes Repo → `dirty = false`; staged Datei (via `write_and_stage`) → dirty; Branch-Name korrekt; Repo ohne HEAD (frisch init) → kein Panic.
  - `git/author_normalize.rs`: Bestand prüfen (`rg "#\[test\]" app/src-tauri/src/git/author_normalize.rs`) — fehlende Fälle ergänzen (Unicode-Folding, leere E-Mail, Groß/Klein).
  - `commands/git_index.rs` + `commands/git_config.rs`: Kern-Funktionen gegen Tmp-Repo (stage/unstage roundtrip; config get/set auf Local-Layer; Fehler bei kaputtem Pfad). Wo Commands `State<AppState>` brauchen → den git2-Kern in freie Funktionen extrahieren (Muster: `collect_commits_range` aus Plan 04/01) statt Tauri-State zu mocken.
  - `auth/token.rs`: Debug-File-Backend gegen Tmp-Dir (set → get roundtrip, get auf fehlenden Key → None, delete).
- [ ] **Step 3: Run**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml`
Expected: PASS, deutlich mehr Tests als Baseline (Baseline vorher mit `cargo test -- --list | wc -l` notieren).

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri/src
git commit -m "test: add tmp-repo backend tests for git and command modules"
```

---

### Task 5: E2E-Critical-Paths (Playwright)

**Files:**

- Create: `tests/src/e2e/app/onboarding.spec.ts`
- Create: `tests/src/e2e/app/repo-add.spec.ts`
- Create: `tests/src/e2e/app/pr-drawer.spec.ts`
- Create: `tests/src/e2e/app/settings-token.spec.ts`

**Vorab:** Bestehende App-Specs lesen (`ls tests/src/e2e`) und deren Setup-Muster (Base-URL, ggf. App-State-Seeding, Test-ID-Zugriff) exakt übernehmen. E2E läuft gegen `yarn dev:web` (Port 3000) — Tauri-IPC no-opt; die Specs testen also UI-Flows ohne echte Git-/Provider-Daten. Wo ein Flow zwingend IPC-Daten braucht, den im Repo etablierten Mock-/Fixture-Mechanismus verwenden (in bestehenden Specs nachsehen); existiert keiner, den Flow auf den erreichbaren Teil reduzieren (z. B. "Settings-Token-Formular validiert + speichert-Button disabled ohne Input" statt "Provider zeigt connected").

**Selektor-Regel:** ausschließlich `getByTestId(...)` — niemals Rollen/Text/CSS.

- [ ] **Step 1: Spec-Gerüst pro Flow** (Beispiel Onboarding):

```ts
import { expect, test } from "@playwright/test";

test.describe("onboarding", () => {
  test("first launch walks through the onboarding flow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-root")).toBeVisible();
    // Schritte gemäß realer Onboarding-testids — IDs aus
    // app/src/lib/constants/testIds.constants.ts ablesen und hier
    // als String-Literale verwenden (Playwright-Workspace hat keinen
    // App-Import; IDs in tests/src/constants/ spiegeln, falls dort
    // bereits eine Constants-Datei existiert — Konvention prüfen).
  });
});
```

- [ ] **Step 2: Die vier Flows implementieren:**
  1. **Onboarding:** Erststart → Onboarding sichtbar → Schritte durchklicken → Dashboard erreicht.
  2. **Repo-Add:** Add-Repo-Modal öffnen → Pfad-Input → Submit → Row erscheint (bzw. Web-Fallback-Verhalten asserten).
  3. **PR-View:** PR-Liste → Row-Klick → Drawer öffnet → Detail-Felder sichtbar.
  4. **Settings-Token:** Settings → Accounts → Token-Input → Save → UI-Feedback.
- [ ] **Step 3: Lokal headless laufen lassen**

Run (PowerShell): `$env:PW_HEADLESS = "1"; yarn workspace @recrest/tests test:e2e src/e2e/app`
Expected: PASS (4 Specs)

- [ ] **Step 4: Commit**

```bash
git add tests/src/e2e
git commit -m "test: add e2e specs for onboarding, repo add, pr drawer and token flow"
```

---

### Task 6: Coverage-Gate setzen + CI-Artifact

**Files:**

- Modify: `app/vitest.config.ts`
- Modify: CI-Workflow (`ls .github/workflows`, den Test-Job finden)

- [ ] **Step 1: Ist-Stand messen**

Run: `yarn workspace @recrest/app test:coverage`
Expected: Summary mit Lines/Branches.

- [ ] **Step 2: Thresholds setzen**

Bei ≥60% Lines und ≥50% Branches:

```ts
    coverage: {
      // ... Bestand aus Task 1 ...
      thresholds: { lines: 60, branches: 50 },
    },
```

Liegt ein Wert darunter: Threshold = `floor(Ist) − 2`, und in `docs/plans/future.md` einen Eintrag „Coverage-Gate auf 60/50 anheben (aktuell X/Y)“ ergänzen.

- [ ] **Step 3: Self-Test des Gates**

Run: `yarn workspace @recrest/app test:coverage`
Expected: PASS. Gegenprobe: einen Threshold temporär auf 99 setzen → Run muss FAILen → zurücksetzen.

- [ ] **Step 4: CI-Job ergänzen**

Im Test-Workflow nach dem Vitest-Step:

```yaml
- name: Coverage
  run: yarn workspace @recrest/app test:coverage
- name: Upload coverage report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: vitest-coverage
    path: app/coverage/
```

(Action-Versionen an die im Workflow bereits verwendeten anpassen. Ein Coverage-Diff-Bot-Kommentar ist optionales Follow-up — nicht Teil dieses Plans.)

- [ ] **Step 5: Commit**

```bash
git add app/vitest.config.ts .github/workflows
git commit -m "chore: enforce vitest coverage thresholds and upload report in ci"
```

---

### Abschluss-Verifikation (alle drei Pläne zusammen)

```bash
yarn typecheck && yarn lint
yarn workspace @recrest/app test:coverage
cargo test --manifest-path app/src-tauri/Cargo.toml
# PowerShell:
$env:PW_HEADLESS = "1"; yarn test:e2e
```

Expected: alles PASS, Coverage-Gate ≥ konfigurierte Thresholds.
