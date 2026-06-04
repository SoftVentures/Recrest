# Plan 04/01 — Activity-Datenfluss, Insights & Nivo-Chart-Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Volle Commit-History mit Range-Picker statt 14-Tage-Fenster, echte Insights, und alle handgerollten SVG-Charts auf Nivo (MIT) migriert.

**Architecture:** Ein neuer `activity`-Redux-Slice (Pattern: `actions/` + `reducers/` + `types/` wie die sechs bestehenden) hält Commits pro Repo mit Range-Merging; das Rust-Backend streamt Commits range-basiert in 1.000er-Chunks über das Event `activity://commits-chunk`. Charts rendern über Nivo mit einem zentralen MUI-Theme→Nivo-Theme-Mapping (`lib/charts/nivoTheme.ts`); `lib/charts/palette.ts` bleibt die Farbquelle.

**Tech Stack:** Tauri v2 (Rust, git2, chrono), React 19, Redux Toolkit (`createSelector` ist in RTK enthalten — **kein** separates `reselect`-Paket nötig), `@nivo/*` (MIT), MUI v9 + Emotion `styled()` (kein `sx`), Vitest, i18next (en+de).

**Konventionen (bindend):** Keine Magic Strings (`TauriCommand`/Event-Namen/`data-testid` aus Constants), Tests selektieren nur über `data-testid`, alle Strings durch `t()` in beide Locales, Imports nicht manuell sortieren, Commits oneline conventional.

---

### Task 1: Nivo-Dependencies

**Files:**

- Modify: `app/package.json` (via yarn)

- [ ] **Step 1: Pakete installieren**

```bash
yarn workspace @recrest/app add @nivo/core @nivo/line @nivo/pie @nivo/bar @nivo/heatmap
```

Hinweis: `reselect` NICHT installieren — `createSelector` kommt aus `@reduxjs/toolkit`.

- [ ] **Step 2: Typecheck als Smoke**

Run: `yarn test:ts`
Expected: PASS (keine neuen Fehler durch die Installation)

- [ ] **Step 3: Commit**

```bash
git add app/package.json yarn.lock
git commit -m "feat: add nivo chart packages"
```

---

### Task 2: MUI→Nivo-Theme-Mapping

**Files:**

- Create: `app/src/lib/charts/nivoTheme.ts`
- Test: `app/src/lib/charts/nivoTheme.test.ts`

- [ ] **Step 1: Failing Test schreiben**

```ts
// app/src/lib/charts/nivoTheme.test.ts
import { createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import { buildNivoTheme } from "@/lib/charts/nivoTheme";

describe("buildNivoTheme", () => {
  it("maps MUI palette into nivo axis/grid/tooltip slots", () => {
    const mui = createTheme({ palette: { mode: "dark" } });
    const nivo = buildNivoTheme(mui);
    expect(nivo.axis?.ticks?.text?.fill).toBe(mui.palette.text.secondary);
    expect(nivo.grid?.line?.stroke).toBe(mui.palette.divider);
    expect(nivo.tooltip?.container?.background).toBe(mui.palette.background.paper);
    expect(nivo.text?.fontFamily).toBe(mui.typography.fontFamily);
  });

  it("produces different tooltip backgrounds for light vs dark", () => {
    const light = buildNivoTheme(createTheme({ palette: { mode: "light" } }));
    const dark = buildNivoTheme(createTheme({ palette: { mode: "dark" } }));
    expect(light.tooltip?.container?.background).not.toBe(dark.tooltip?.container?.background);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss failen**

Run: `yarn workspace @recrest/app test src/lib/charts/nivoTheme.test.ts`
Expected: FAIL (`Cannot find module '@/lib/charts/nivoTheme'`)

- [ ] **Step 3: Implementierung**

```ts
// app/src/lib/charts/nivoTheme.ts
import type { Theme as MuiTheme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import type { Theme as NivoTheme } from "@nivo/core";
import { useMemo } from "react";

/**
 * Single source of truth for chart chrome: derives the Nivo theme from the
 * active MUI theme so dark/light and brand palette stay in sync without a
 * second hand-maintained color table. Series colors stay in
 * `lib/charts/palette.ts` (CHART_PALETTE) — this module only owns axes,
 * grid, labels, legends, and tooltip chrome.
 */
export function buildNivoTheme(mui: MuiTheme): NivoTheme {
  const tick = { fill: mui.palette.text.secondary, fontSize: 11 };
  return {
    text: {
      fontFamily: mui.typography.fontFamily,
      fontSize: 11,
      fill: mui.palette.text.secondary,
    },
    axis: {
      ticks: { text: tick, line: { stroke: mui.palette.divider, strokeWidth: 1 } },
      legend: { text: { ...tick, fontSize: 12 } },
      domain: { line: { stroke: mui.palette.divider, strokeWidth: 1 } },
    },
    grid: { line: { stroke: mui.palette.divider, strokeWidth: 1 } },
    legends: { text: tick },
    labels: { text: { ...tick, fill: mui.palette.text.primary } },
    crosshair: { line: { stroke: mui.palette.text.secondary, strokeWidth: 1 } },
    tooltip: {
      container: {
        background: mui.palette.background.paper,
        color: mui.palette.text.primary,
        fontSize: 12,
        borderRadius: 8,
        boxShadow: mui.shadows[4],
      },
    },
  };
}

/** Memoized hook variant for components. */
export function useNivoTheme(): NivoTheme {
  const mui = useTheme();
  return useMemo(() => buildNivoTheme(mui), [mui]);
}
```

- [ ] **Step 4: Test laufen lassen — muss passen**

Run: `yarn workspace @recrest/app test src/lib/charts/nivoTheme.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/charts/nivoTheme.ts app/src/lib/charts/nivoTheme.test.ts
git commit -m "feat: add mui-to-nivo theme mapping"
```

---

### Task 3: Shared-Constants & -Types für Range-Commits

**Files:**

- Modify: `shared/src/constants/commands.ts`
- Modify: `shared/src/constants/events.ts`
- Create: `shared/src/types/activity.ts`
- Modify: `shared/src/index.ts` (Re-Export, Pattern der Nachbar-Types prüfen)

- [ ] **Step 1: Command-Namen ergänzen**

In `shared/src/constants/commands.ts` im `TauriCommand`-Objekt (alphabetisch neben `LIST_RECENT_COMMITS: "list_recent_commits"` einsortieren):

```ts
  GET_OLDEST_COMMIT_DATE: "get_oldest_commit_date",
  LIST_COMMITS: "list_commits",
```

- [ ] **Step 2: Event-Konstante ergänzen**

In `shared/src/constants/events.ts` (Pattern der Nachbarn übernehmen):

```ts
/** Streamed commit batches for a `list_commits` request (Plan 04/01).
 *  Payload: `CommitsChunkPayload`. */
export const ACTIVITY_COMMITS_CHUNK_EVENT = "activity://commits-chunk";
```

und im `IPC`-Aggregat-Objekt: `ACTIVITY_COMMITS_CHUNK: ACTIVITY_COMMITS_CHUNK_EVENT,`.

- [ ] **Step 3: Types anlegen**

```ts
// shared/src/types/activity.ts
import type { RecentCommit } from "./repo.js";

/** ISO-8601 UTC strings, `since <= until`. */
export interface ActivityRange {
  since: string;
  until: string;
}

/** One streamed batch from `list_commits`. `done` marks the final chunk for
 *  a repo within the request; `truncated` means the per-repo cap was hit. */
export interface CommitsChunkPayload {
  requestId: string;
  repoId: string;
  commits: RecentCommit[];
  done: boolean;
  truncated: boolean;
}

/** One-shot return value of `list_commits` — totals per repo after the
 *  stream completed. Commit data itself only travels via chunk events. */
export interface ListCommitsSummary {
  requestId: string;
  totals: Record<string, number>;
  truncated: Record<string, boolean>;
}
```

Re-Export in `shared/src/index.ts` analog zu den bestehenden `types/*`-Exports ergänzen.

- [ ] **Step 4: Shared bauen + Typecheck**

Run: `yarn workspace @recrest/shared build && yarn test:ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/src
git commit -m "feat: add activity range commands, chunk event and types to shared"
```

---

### Task 4: Rust — Range-basiertes `list_commits` mit Chunk-Streaming

**Files:**

- Modify: `app/src-tauri/src/commands/repos.rs` (neben `list_recent_commits`, Zeile ~236)
- Modify: `app/src-tauri/src/lib.rs` — `generate_handler![...]` (**beide** Blöcke!)
- Test: inline `#[cfg(test)]` in `repos.rs`

**Design:** Der testbare Kern ist eine pure Funktion mit Chunk-Callback — das Tauri-Command ist nur ein dünner Wrapper, der den Callback an `app.emit(...)` bindet. So brauchen die Tests kein `AppHandle`.

- [ ] **Step 1: Failing Tests schreiben**

In `repos.rs` ans Modulende (Tmp-Repo-Helper; falls es schon einen Fixture-Helper im Crate gibt — `rg "TempDir" app/src-tauri/src` — den wiederverwenden):

```rust
#[cfg(test)]
mod range_tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    /// Builds a throwaway repo with one commit per entry in `days_ago`,
    /// committed at 12:00 UTC `n` days before `anchor`.
    fn fixture_repo(days_ago: &[i64], anchor: chrono::DateTime<Utc>) -> (tempfile::TempDir, git2::Repository) {
        let dir = tempfile::tempdir().expect("tmpdir");
        let repo = git2::Repository::init(dir.path()).expect("init");
        let mut parent: Option<git2::Oid> = None;
        // Oldest first so revwalk TIME order matches reality.
        let mut sorted: Vec<i64> = days_ago.to_vec();
        sorted.sort_unstable_by(|a, b| b.cmp(a));
        for (i, d) in sorted.iter().enumerate() {
            let ts = anchor - chrono::Duration::days(*d);
            let sig = git2::Signature::new(
                "Test Author",
                "test@example.com",
                &git2::Time::new(ts.timestamp(), 0),
            )
            .expect("sig");
            let tree_id = {
                let mut index = repo.index().expect("index");
                index.write_tree().expect("tree")
            };
            let tree = repo.find_tree(tree_id).expect("find tree");
            let parents: Vec<git2::Commit> = parent
                .map(|oid| vec![repo.find_commit(oid).expect("parent")])
                .unwrap_or_default();
            let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
            let oid = repo
                .commit(Some("HEAD"), &sig, &sig, &format!("commit {i}"), &tree, &parent_refs)
                .expect("commit");
            parent = Some(oid);
        }
        (dir, repo)
    }

    #[test]
    fn range_filter_takes_only_commits_inside_window() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        // 10 commits spread over ~6 months; 5 of them inside the last 30 days.
        let (_dir, repo) = fixture_repo(&[1, 5, 10, 20, 29, 45, 80, 120, 150, 170], anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut collected: Vec<RecentCommitDto> = Vec::new();
        let truncated = collect_commits_range(
            "id", "name", &repo, since, anchor, 5_000, 1_000,
            &mut |chunk: Vec<RecentCommitDto>, _done| collected.extend(chunk),
        )
        .expect("collect");
        assert_eq!(collected.len(), 5);
        assert!(!truncated);
        assert!(collected.iter().all(|c| c.timestamp >= since && c.timestamp <= anchor));
    }

    #[test]
    fn chunking_emits_thousand_sized_batches() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        // 2500 commits on consecutive minutes — small enough for CI, still 3 chunks.
        let minutes: Vec<i64> = (0..2_500).collect();
        let (_dir, repo) = fixture_repo_minutes(&minutes, anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut chunk_sizes: Vec<usize> = Vec::new();
        collect_commits_range(
            "id", "name", &repo, since, anchor, 5_000, 1_000,
            &mut |chunk, _done| chunk_sizes.push(chunk.len()),
        )
        .expect("collect");
        assert_eq!(chunk_sizes, vec![1_000, 1_000, 500]);
    }

    #[test]
    fn cap_truncates_and_reports() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let minutes: Vec<i64> = (0..1_200).collect();
        let (_dir, repo) = fixture_repo_minutes(&minutes, anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut total = 0usize;
        let truncated = collect_commits_range(
            "id", "name", &repo, since, anchor, 1_000, 1_000,
            &mut |chunk, _done| total += chunk.len(),
        )
        .expect("collect");
        assert_eq!(total, 1_000);
        assert!(truncated);
    }

    /// Like `fixture_repo` but one commit per entry, `n` minutes before anchor.
    fn fixture_repo_minutes(minutes_ago: &[i64], anchor: chrono::DateTime<Utc>) -> (tempfile::TempDir, git2::Repository) {
        // Same body as fixture_repo with `Duration::minutes(*d)` instead of days.
        let dir = tempfile::tempdir().expect("tmpdir");
        let repo = git2::Repository::init(dir.path()).expect("init");
        let mut parent: Option<git2::Oid> = None;
        let mut sorted: Vec<i64> = minutes_ago.to_vec();
        sorted.sort_unstable_by(|a, b| b.cmp(a));
        for (i, m) in sorted.iter().enumerate() {
            let ts = anchor - chrono::Duration::minutes(*m);
            let sig = git2::Signature::new("Test Author", "test@example.com", &git2::Time::new(ts.timestamp(), 0)).expect("sig");
            let tree_id = { let mut index = repo.index().expect("index"); index.write_tree().expect("tree") };
            let tree = repo.find_tree(tree_id).expect("find tree");
            let parents: Vec<git2::Commit> = parent.map(|oid| vec![repo.find_commit(oid).expect("parent")]).unwrap_or_default();
            let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
            parent = Some(repo.commit(Some("HEAD"), &sig, &sig, &format!("commit {i}"), &tree, &parent_refs).expect("commit"));
        }
        (dir, repo)
    }

    #[test]
    fn oldest_commit_date_finds_root() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let (_dir, repo) = fixture_repo(&[1, 100, 200], anchor);
        let oldest = oldest_commit_date(&repo).expect("some");
        assert_eq!(oldest, anchor - chrono::Duration::days(200));
    }
}
```

`tempfile` als dev-dependency prüfen (`rg "tempfile" app/src-tauri/Cargo.toml`), sonst: `cargo add --dev tempfile` in `app/src-tauri/`.

- [ ] **Step 2: Tests laufen lassen — müssen failen**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml range_tests`
Expected: COMPILE ERROR (`collect_commits_range` / `oldest_commit_date` not found)

- [ ] **Step 3: Kern-Funktionen implementieren**

In `repos.rs`:

```rust
/// Hard default cap per repo per request; the UI may raise it explicitly.
pub const MAX_COMMITS_PER_REPO_DEFAULT: u32 = 5_000;
/// Streamed batch size for `activity://commits-chunk`.
pub const COMMITS_CHUNK_SIZE: usize = 1_000;

/// Walks `repo` newest-first, collecting commits with `since <= ts <= until`
/// into batches of `chunk_size` handed to `on_chunk(batch, done)`. Returns
/// whether the walk was truncated by `cap`. Pure w.r.t. Tauri so tests don't
/// need an `AppHandle`.
pub fn collect_commits_range(
    id: &str,
    name: &str,
    repo: &git2::Repository,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
    cap: u32,
    chunk_size: usize,
    on_chunk: &mut dyn FnMut(Vec<RecentCommitDto>, bool),
) -> Result<bool, git2::Error> {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => {
            on_chunk(Vec::new(), true);
            return Ok(false);
        }
    };
    let Some(head_oid) = head.target() else {
        on_chunk(Vec::new(), true);
        return Ok(false);
    };
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::TIME)?;
    revwalk.push(head_oid)?;

    let mut batch: Vec<RecentCommitDto> = Vec::with_capacity(chunk_size);
    let mut emitted: u32 = 0;
    let mut truncated = false;
    for oid in revwalk {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else { continue };
        let ts = commit.time().seconds();
        let Some(utc_ts) = Utc.timestamp_opt(ts, 0).single() else { continue };
        if utc_ts > until {
            continue; // newer than the window — keep walking
        }
        if utc_ts < since {
            break; // TIME-sorted: the rest is older
        }
        if emitted >= cap {
            truncated = true;
            break;
        }
        let author = commit.author();
        let email = author.email().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let display_name = author.name().unwrap_or("unknown").to_string();
        let signature_key =
            crate::git::author_normalize::signature_key(&display_name, email.as_deref());
        batch.push(RecentCommitDto {
            sha: commit.id().to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            author: display_name,
            author_email: email,
            signature_key,
            timestamp: utc_ts,
            repo_id: id.to_string(),
            repo_name: name.to_string(),
        });
        emitted += 1;
        if batch.len() >= chunk_size {
            on_chunk(std::mem::take(&mut batch), false);
        }
    }
    on_chunk(batch, true); // final flush, may be empty — carries `done`
    Ok(truncated)
}

/// Timestamp of the root (oldest) commit reachable from HEAD, if any.
pub fn oldest_commit_date(repo: &git2::Repository) -> Option<DateTime<Utc>> {
    let head_oid = repo.head().ok()?.target()?;
    let mut revwalk = repo.revwalk().ok()?;
    revwalk.set_sorting(git2::Sort::TIME | git2::Sort::REVERSE).ok()?;
    revwalk.push(head_oid).ok()?;
    let oldest = revwalk.flatten().next()?;
    let commit = repo.find_commit(oldest).ok()?;
    Utc.timestamp_opt(commit.time().seconds(), 0).single()
}
```

- [ ] **Step 4: Tests laufen lassen — müssen passen**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml range_tests`
Expected: PASS (4 tests)

- [ ] **Step 5: Tauri-Commands als dünne Wrapper**

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitsChunkPayload {
    pub request_id: String,
    pub repo_id: String,
    pub commits: Vec<RecentCommitDto>,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsSummaryDto {
    pub request_id: String,
    pub totals: std::collections::HashMap<String, u32>,
    pub truncated: std::collections::HashMap<String, bool>,
}

/// Range-based replacement for `list_recent_commits` (Plan 04/01 §C.1).
/// Commit data is streamed via `activity://commits-chunk`; the return value
/// only carries per-repo totals + truncation flags.
#[tauri::command]
pub async fn list_commits(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    repo_ids: Option<Vec<String>>,
    since: String,
    until: String,
    max_commits_per_repo: Option<u32>,
) -> Result<ListCommitsSummaryDto, CommandError> {
    use tauri::Emitter;
    let since: DateTime<Utc> = since
        .parse()
        .map_err(|e| CommandError::bad_request(format!("invalid since: {e}")))?;
    let until: DateTime<Utc> = until
        .parse()
        .map_err(|e| CommandError::bad_request(format!("invalid until: {e}")))?;
    if since > until {
        return Err(CommandError::bad_request("since must be <= until"));
    }
    let cap = max_commits_per_repo.unwrap_or(MAX_COMMITS_PER_REPO_DEFAULT);

    let config = state.config.lock().await;
    let records: Vec<(String, String, PathBuf)> = config
        .settings()
        .repos
        .values()
        .filter(|r| repo_ids.as_ref().map_or(true, |ids| ids.contains(&r.id)))
        .map(|r| (r.id.clone(), r.name.clone(), r.path.clone()))
        .collect();
    drop(config);

    let mut totals = std::collections::HashMap::new();
    let mut truncated_map = std::collections::HashMap::new();
    for (id, name, path) in records {
        let Ok(repo) = git2::Repository::open(&path) else {
            tracing::debug!("list_commits: skipped {id}: open failed");
            continue;
        };
        let mut total: u32 = 0;
        let truncated = collect_commits_range(
            &id, &name, &repo, since, until, cap, COMMITS_CHUNK_SIZE,
            &mut |commits, done| {
                total += commits.len() as u32;
                let _ = app.emit(
                    "activity://commits-chunk",
                    CommitsChunkPayload {
                        request_id: request_id.clone(),
                        repo_id: id.clone(),
                        commits,
                        done,
                        truncated: false, // final value patched below via summary
                    },
                );
            },
        )
        .map_err(|e| CommandError::internal(format!("walk failed for {id}: {e}")))?;
        totals.insert(id.clone(), total);
        truncated_map.insert(id, truncated);
    }
    Ok(ListCommitsSummaryDto { request_id, totals, truncated: truncated_map })
}

/// Oldest commit timestamp across the given repos — feeds the `all` preset.
#[tauri::command]
pub async fn get_oldest_commit_date(
    state: State<'_, AppState>,
    repo_ids: Option<Vec<String>>,
) -> Result<Option<DateTime<Utc>>, CommandError> {
    let config = state.config.lock().await;
    let paths: Vec<PathBuf> = config
        .settings()
        .repos
        .values()
        .filter(|r| repo_ids.as_ref().map_or(true, |ids| ids.contains(&r.id)))
        .map(|r| r.path.clone())
        .collect();
    drop(config);
    Ok(paths
        .iter()
        .filter_map(|p| git2::Repository::open(p).ok())
        .filter_map(|repo| oldest_commit_date(&repo))
        .min())
}
```

Der Event-Name `"activity://commits-chunk"` muss exakt `ACTIVITY_COMMITS_CHUNK_EVENT` aus Task 3 spiegeln — Kommentar mit Verweis dazuschreiben (Konvention der bestehenden Events, siehe `REPO_STATUS_EVENT`).

- [ ] **Step 6: In beide `generate_handler!`-Blöcke in `lib.rs` eintragen**

`rg "list_recent_commits" app/src-tauri/src/lib.rs` zeigt beide Stellen; direkt daneben `list_commits` und `get_oldest_commit_date` ergänzen. **Das Vergessen ist der häufigste Silent-Breakage im Repo.**

- [ ] **Step 7: Volle Rust-Verifikation**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml`
Expected: PASS (alle, inkl. Bestand)

- [ ] **Step 8: Commit**

```bash
git add app/src-tauri/src/commands/repos.rs app/src-tauri/src/lib.rs app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock
git commit -m "feat: add range-based list_commits with chunk streaming and oldest-commit lookup"
```

---

### Task 5: Range-Merging als Pure-Function-Modul

**Files:**

- Create: `app/src/lib/activity/rangeMerge.ts`
- Test: `app/src/lib/activity/rangeMerge.test.ts`

- [ ] **Step 1: Failing Tests (alle 4 Merge-Cases)**

```ts
// app/src/lib/activity/rangeMerge.test.ts
import { describe, expect, it } from "vitest";

import { mergeRange, missingSubranges } from "@/lib/activity/rangeMerge";

const R = (since: string, until: string) => ({ since, until });

describe("missingSubranges", () => {
  it("null loaded → whole requested range is missing", () => {
    expect(missingSubranges(null, R("2026-01-01", "2026-02-01"))).toEqual([
      R("2026-01-01", "2026-02-01"),
    ]);
  });

  it("subset → nothing missing", () => {
    expect(missingSubranges(R("2026-01-01", "2026-03-01"), R("2026-01-10", "2026-02-01"))).toEqual(
      [],
    );
  });

  it("overlap left → only the earlier gap is missing", () => {
    expect(missingSubranges(R("2026-02-01", "2026-03-01"), R("2026-01-01", "2026-02-15"))).toEqual([
      R("2026-01-01", "2026-02-01"),
    ]);
  });

  it("overlap right → only the later gap is missing", () => {
    expect(missingSubranges(R("2026-01-01", "2026-02-01"), R("2026-01-15", "2026-03-01"))).toEqual([
      R("2026-02-01", "2026-03-01"),
    ]);
  });

  it("requested superset → both gaps are missing", () => {
    expect(missingSubranges(R("2026-02-01", "2026-02-15"), R("2026-01-01", "2026-03-01"))).toEqual([
      R("2026-01-01", "2026-02-01"),
      R("2026-02-15", "2026-03-01"),
    ]);
  });

  it("disjoint → whole requested range is missing (loaded gets replaced)", () => {
    expect(missingSubranges(R("2026-01-01", "2026-01-10"), R("2026-03-01", "2026-03-10"))).toEqual([
      R("2026-03-01", "2026-03-10"),
    ]);
  });
});

describe("mergeRange", () => {
  it("expands loaded to the union on overlap", () => {
    expect(mergeRange(R("2026-01-01", "2026-02-01"), R("2026-01-15", "2026-03-01"))).toEqual(
      R("2026-01-01", "2026-03-01"),
    );
  });

  it("disjoint replaces loaded with requested (single-range invariant)", () => {
    expect(mergeRange(R("2026-01-01", "2026-01-10"), R("2026-03-01", "2026-03-10"))).toEqual(
      R("2026-03-01", "2026-03-10"),
    );
  });

  it("null loaded → requested", () => {
    expect(mergeRange(null, R("2026-01-01", "2026-02-01"))).toEqual(R("2026-01-01", "2026-02-01"));
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `yarn workspace @recrest/app test src/lib/activity/rangeMerge.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implementierung**

```ts
// app/src/lib/activity/rangeMerge.ts
import type { ActivityRange } from "@recrest/shared";

/** ISO strings compare lexicographically, so no Date parsing needed here. */
const overlapsOrTouches = (a: ActivityRange, b: ActivityRange) =>
  a.since <= b.until && b.since <= a.until;

/**
 * Which parts of `requested` are not covered by `loaded` and must be fetched?
 * Invariant: each repo keeps at most ONE contiguous loaded range. For a
 * disjoint request the whole requested range is fetched and the old data is
 * replaced (see `mergeRange`).
 */
export function missingSubranges(
  loaded: ActivityRange | null,
  requested: ActivityRange,
): ActivityRange[] {
  if (!loaded || !overlapsOrTouches(loaded, requested)) return [requested];
  const gaps: ActivityRange[] = [];
  if (requested.since < loaded.since) gaps.push({ since: requested.since, until: loaded.since });
  if (requested.until > loaded.until) gaps.push({ since: loaded.until, until: requested.until });
  return gaps;
}

/** New `rangeLoaded` after fetching `requested`: union on overlap, replace on disjoint. */
export function mergeRange(loaded: ActivityRange | null, requested: ActivityRange): ActivityRange {
  if (!loaded || !overlapsOrTouches(loaded, requested)) return requested;
  return {
    since: loaded.since < requested.since ? loaded.since : requested.since,
    until: loaded.until > requested.until ? loaded.until : requested.until,
  };
}
```

- [ ] **Step 4: Run — PASS**

Run: `yarn workspace @recrest/app test src/lib/activity/rangeMerge.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/activity
git commit -m "feat: add activity range merge helpers"
```

---

### Task 6: `activity`-Slice (types + actions + reducer + selectors)

**Files:**

- Create: `app/src/store/types/activity.types.ts`
- Create: `app/src/store/actions/activity.actions.ts`
- Create: `app/src/store/reducers/activityReducer.ts`
- Create: `app/src/store/selectors/activity.selectors.ts`
- Modify: `app/src/store/index.ts`
- Test: `app/src/store/reducers/activityReducer.test.ts`

- [ ] **Step 1: Types**

```ts
// app/src/store/types/activity.types.ts
import type { ActivityRange, RecentCommit } from "@recrest/shared";

export interface RepoCommits {
  rangeLoaded: ActivityRange | null;
  commits: RecentCommit[];
  status: "idle" | "loading" | "error";
  truncated: boolean;
}

export interface ActivityState {
  commitsByRepo: Record<string, RepoCommits>;
  /** Single source of truth for the picker; mirrored to the URL by the page. */
  selectedRange: ActivityRange;
  /** Oldest commit across all repos — bound of the `all` preset. */
  oldestCommitDate: string | null;
  /** Id of the in-flight `list_commits` request; stale chunks are dropped. */
  activeRequestId: string | null;
}
```

- [ ] **Step 2: Actions**

```ts
// app/src/store/actions/activity.actions.ts
import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type ActivityRange,
  type CommitsChunkPayload,
  type ListCommitsSummary,
  TauriCommand,
} from "@recrest/shared";

import { missingSubranges } from "@/lib/activity/rangeMerge";
import { invoke } from "@/lib/tauri";
import type { RootState } from "@/store";

export const setSelectedRange = createAction<ActivityRange>("activity/setSelectedRange");
export const commitsChunkReceived = createAction<CommitsChunkPayload>(
  "activity/commitsChunkReceived",
);

/** Fetches only the parts of `range` that are not loaded yet (per repo the
 *  union of missing subranges is requested in one call — the backend walk is
 *  cheap, dedupe happens in the reducer via sha). */
export const fetchCommitsRange = createAsyncThunk<
  ListCommitsSummary | null,
  { range: ActivityRange; requestId: string },
  { state: RootState }
>("activity/fetchCommitsRange", async ({ range, requestId }, { getState }) => {
  const byRepo = getState().activity.commitsByRepo;
  // Use the widest already-loaded range across repos as the merge anchor —
  // repos are fetched together, so their rangeLoaded values stay in lockstep.
  const anyLoaded = Object.values(byRepo).find((r) => r.rangeLoaded)?.rangeLoaded ?? null;
  const gaps = missingSubranges(anyLoaded, range);
  if (gaps.length === 0) return null;
  const since = gaps.reduce((a, g) => (g.since < a ? g.since : a), gaps[0]!.since);
  const until = gaps.reduce((a, g) => (g.until > a ? g.until : a), gaps[0]!.until);
  return invoke<ListCommitsSummary>(TauriCommand.LIST_COMMITS, {
    requestId,
    since,
    until,
  });
});

export const fetchOldestCommitDate = createAsyncThunk<string | null>(
  "activity/fetchOldestCommitDate",
  async () => invoke<string | null>(TauriCommand.GET_OLDEST_COMMIT_DATE, {}),
);
```

- [ ] **Step 3: Failing Reducer-Tests**

```ts
// app/src/store/reducers/activityReducer.test.ts
import { describe, expect, it } from "vitest";

import type { RecentCommit } from "@recrest/shared";

import {
  commitsChunkReceived,
  fetchCommitsRange,
  setSelectedRange,
} from "@/store/actions/activity.actions";
import { activityReducer, initialActivityState } from "@/store/reducers/activityReducer";

const commit = (sha: string, ts: string): RecentCommit => ({
  sha,
  summary: "s",
  author: "a",
  authorEmail: null,
  timestamp: ts,
  repoId: "r1",
  repoName: "repo-one",
});

const chunk = (overrides: Partial<Parameters<typeof commitsChunkReceived>[0]> = {}) =>
  commitsChunkReceived({
    requestId: "req-1",
    repoId: "r1",
    commits: [commit("abc", "2026-05-01T10:00:00Z")],
    done: true,
    truncated: false,
    ...overrides,
  });

describe("activityReducer", () => {
  it("stores the selected range", () => {
    const next = activityReducer(
      initialActivityState,
      setSelectedRange({ since: "2026-01-01", until: "2026-02-01" }),
    );
    expect(next.selectedRange).toEqual({ since: "2026-01-01", until: "2026-02-01" });
  });

  it("pending marks the request active", () => {
    const next = activityReducer(
      initialActivityState,
      fetchCommitsRange.pending("x", {
        range: initialActivityState.selectedRange,
        requestId: "req-1",
      }),
    );
    expect(next.activeRequestId).toBe("req-1");
  });

  it("appends chunk commits for the active request", () => {
    let state = activityReducer(
      initialActivityState,
      fetchCommitsRange.pending("x", {
        range: initialActivityState.selectedRange,
        requestId: "req-1",
      }),
    );
    state = activityReducer(state, chunk());
    expect(state.commitsByRepo["r1"]?.commits).toHaveLength(1);
  });

  it("drops chunks from stale requests", () => {
    let state = activityReducer(
      initialActivityState,
      fetchCommitsRange.pending("x", {
        range: initialActivityState.selectedRange,
        requestId: "req-2",
      }),
    );
    state = activityReducer(state, chunk({ requestId: "req-1" }));
    expect(state.commitsByRepo["r1"]).toBeUndefined();
  });

  it("dedupes commits by sha across chunks", () => {
    let state = activityReducer(
      initialActivityState,
      fetchCommitsRange.pending("x", {
        range: initialActivityState.selectedRange,
        requestId: "req-1",
      }),
    );
    state = activityReducer(state, chunk({ done: false }));
    state = activityReducer(state, chunk());
    expect(state.commitsByRepo["r1"]?.commits).toHaveLength(1);
  });

  it("records truncation per repo", () => {
    let state = activityReducer(
      initialActivityState,
      fetchCommitsRange.pending("x", {
        range: initialActivityState.selectedRange,
        requestId: "req-1",
      }),
    );
    state = activityReducer(state, chunk({ truncated: true }));
    expect(state.commitsByRepo["r1"]?.truncated).toBe(true);
  });
});
```

- [ ] **Step 4: Run — FAIL**

Run: `yarn workspace @recrest/app test src/store/reducers/activityReducer.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 5: Reducer implementieren**

```ts
// app/src/store/reducers/activityReducer.ts
import { createReducer } from "@reduxjs/toolkit";

import { mergeRange } from "@/lib/activity/rangeMerge";
import {
  commitsChunkReceived,
  fetchCommitsRange,
  fetchOldestCommitDate,
  setSelectedRange,
} from "@/store/actions/activity.actions";
import type { ActivityState, RepoCommits } from "@/store/types/activity.types";

const DAY_MS = 86_400_000;

/** Default window: last 30 days (Plan 04/01 §C.1 "Default-Lazy"). Computed
 *  once at module load — the page refreshes it via the picker anyway. */
function defaultRange() {
  const until = new Date();
  const since = new Date(until.getTime() - 30 * DAY_MS);
  return { since: since.toISOString(), until: until.toISOString() };
}

export const initialActivityState: ActivityState = {
  commitsByRepo: {},
  selectedRange: defaultRange(),
  oldestCommitDate: null,
  activeRequestId: null,
};

const emptyRepo = (): RepoCommits => ({
  rangeLoaded: null,
  commits: [],
  status: "loading",
  truncated: false,
});

export const activityReducer = createReducer(initialActivityState, (builder) => {
  builder
    .addCase(setSelectedRange, (state, action) => {
      state.selectedRange = action.payload;
    })
    .addCase(fetchCommitsRange.pending, (state, action) => {
      state.activeRequestId = action.meta.arg.requestId;
    })
    .addCase(fetchCommitsRange.fulfilled, (state, action) => {
      state.activeRequestId = null;
      if (!action.payload) return; // range was already covered — no-op
      const requested = action.meta.arg.range;
      for (const [repoId, truncated] of Object.entries(action.payload.truncated)) {
        const repo = state.commitsByRepo[repoId] ?? emptyRepo();
        repo.truncated = truncated;
        repo.status = "idle";
        repo.rangeLoaded = mergeRange(repo.rangeLoaded, requested);
        state.commitsByRepo[repoId] = repo;
      }
    })
    .addCase(fetchCommitsRange.rejected, (state) => {
      state.activeRequestId = null;
      for (const repo of Object.values(state.commitsByRepo)) {
        if (repo.status === "loading") repo.status = "error";
      }
    })
    .addCase(commitsChunkReceived, (state, action) => {
      const { requestId, repoId, commits, truncated } = action.payload;
      if (requestId !== state.activeRequestId) return; // stale stream
      const repo = state.commitsByRepo[repoId] ?? emptyRepo();
      const seen = new Set(repo.commits.map((c) => c.sha));
      for (const c of commits) {
        if (!seen.has(c.sha)) repo.commits.push(c);
      }
      if (truncated) repo.truncated = true;
      state.commitsByRepo[repoId] = repo;
    })
    .addCase(fetchOldestCommitDate.fulfilled, (state, action) => {
      state.oldestCommitDate = action.payload;
    });
});
```

- [ ] **Step 6: Selectors (memoized via RTK `createSelector`)**

```ts
// app/src/store/selectors/activity.selectors.ts
import { createSelector } from "@reduxjs/toolkit";

import type { RecentCommit } from "@recrest/shared";

import type { RootState } from "@/store";

const selectCommitsByRepo = (s: RootState) => s.activity.commitsByRepo;
export const selectSelectedRange = (s: RootState) => s.activity.selectedRange;

/** All loaded commits inside the selected range, newest first. */
export const selectCommitsInRange = createSelector(
  [selectCommitsByRepo, selectSelectedRange],
  (byRepo, range): RecentCommit[] => {
    const out: RecentCommit[] = [];
    for (const repo of Object.values(byRepo)) {
      for (const c of repo.commits) {
        if (c.timestamp >= range.since && c.timestamp <= range.until) out.push(c);
      }
    }
    return out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },
);

export const selectAnyTruncated = createSelector([selectCommitsByRepo], (byRepo) =>
  Object.values(byRepo).some((r) => r.truncated),
);

export const selectCommitsLoading = (s: RootState) => s.activity.activeRequestId !== null;
```

- [ ] **Step 7: Slice in `store/index.ts` registrieren**

`activity: activityReducer` ins `reducer`-Objekt (Import alphabetisch — prettier sortiert).

- [ ] **Step 8: Run — PASS**

Run: `yarn workspace @recrest/app test src/store/reducers/activityReducer.test.ts && yarn test:ts`
Expected: PASS (6 tests, kein TS-Fehler)

- [ ] **Step 9: Commit**

```bash
git add app/src/store
git commit -m "feat: add activity slice with range merging and chunk streaming"
```

---

### Task 7: Event-Subscription + `useActivityCommits`-Hook

**Files:**

- Create: `app/src/hooks/useActivityCommits.ts`
- Test: `app/src/hooks/useActivityCommits.test.tsx` (optional — Logik steckt im Reducer; mindestens ein Listener-Wiring-Test)

- [ ] **Step 1: Hook implementieren**

```ts
// app/src/hooks/useActivityCommits.ts
import { useEffect } from "react";

import {
  ACTIVITY_COMMITS_CHUNK_EVENT,
  type CommitsChunkPayload,
  type RecentCommit,
} from "@recrest/shared";

import { isTauri, listen } from "@/lib/tauri";
import { commitsChunkReceived, fetchCommitsRange } from "@/store/actions/activity.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAnyTruncated,
  selectCommitsInRange,
  selectCommitsLoading,
  selectSelectedRange,
} from "@/store/selectors/activity.selectors";

/** Range-driven replacement for `useRecentCommits`: subscribes to the chunk
 *  stream, (re)fetches missing subranges whenever the selected range widens,
 *  and refetches on the global `refreshNonce`. */
export function useActivityCommits(): {
  commits: RecentCommit[];
  loading: boolean;
  truncated: boolean;
} {
  const dispatch = useAppDispatch();
  const range = useAppSelector(selectSelectedRange);
  const nonce = useAppSelector((s) => s.ui.refreshNonce);
  const commits = useAppSelector(selectCommitsInRange);
  const loading = useAppSelector(selectCommitsLoading);
  const truncated = useAppSelector(selectAnyTruncated);

  useEffect(() => {
    const unsub = listen<CommitsChunkPayload>(ACTIVITY_COMMITS_CHUNK_EVENT, (payload) => {
      dispatch(commitsChunkReceived(payload));
    });
    return () => {
      void unsub.then((u) => u());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isTauri()) return;
    dispatch(fetchCommitsRange({ range, requestId: crypto.randomUUID() }));
  }, [dispatch, range, nonce]);

  return { commits, loading, truncated };
}
```

Vorab prüfen, welche Signatur `listen` in `app/src/lib/tauri/index.ts` exakt hat (Promise-Unsubscribe vs. sync) und den `useEffect`-Cleanup daran anpassen.

- [ ] **Step 2: Typecheck + bestehende Hook-Tests**

Run: `yarn test:ts && yarn workspace @recrest/app test src/hooks`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useActivityCommits.ts
git commit -m "feat: add useActivityCommits hook with chunk subscription"
```

---

### Task 8: Aggregations-Funktionen für variable Fenster parameterisieren

**Files:**

- Modify: `app/src/lib/activityStats.ts` — `daysAgo`, `currentStreak`, `longestStreak`, `computeActivityStats`, `computeStackedChart`, `computeLeaderboard`
- Modify: `app/src/lib/activityAggregates.ts` — `computePrVelocity`, `computeCiPassRate`, `computeHeatmap` (Filter-Aufrufe von `daysAgo`)
- Test: bestehende Tests dieser Module erweitern (Datei per `rg "activityStats" app/src --glob "*.test.ts"` finden)

**Kern:** Alle Funktionen, die heute hart auf `ACTIVITY_DAYS = 14` rechnen, bekommen einen letzten Parameter `windowDays: number = ACTIVITY_DAYS`. `ACTIVITY_DAYS` bleibt als Default bestehen (Dashboard nutzt weiter 14, bis Task 13 es umstellt).

- [ ] **Step 1: Failing Test — `daysAgo` mit weitem Fenster**

In den bestehenden Test der Datei (oder neu anlegen):

```ts
it("daysAgo accepts a custom window", () => {
  const today = new Date("2026-06-01T00:00:00");
  expect(daysAgo("2026-04-01T10:00:00Z", today, 90)).toBeGreaterThan(13);
  expect(daysAgo("2026-04-01T10:00:00Z", today)).toBe(-1); // default 14 unchanged
});
```

- [ ] **Step 2: Run — FAIL**, dann Signaturen umstellen

```ts
export function daysAgo(
  isoTimestamp: string,
  today: Date,
  windowDays: number = ACTIVITY_DAYS,
): number {
  const commitDay = msStartOfLocalDay(new Date(isoTimestamp));
  const days = Math.floor((today.getTime() - commitDay) / 86_400_000);
  if (days < 0 || days >= windowDays) return -1;
  return days;
}
```

Gleiche Mechanik für alle o. g. Funktionen: `Array.from({ length: windowDays }, ...)` statt `ACTIVITY_DAYS`, Parameter durchreichen. Call-Sites zunächst unverändert lassen (Default greift).

- [ ] **Step 3: Alle betroffenen Tests laufen lassen**

Run: `yarn workspace @recrest/app test src/lib/activityStats src/lib/activityAggregates`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/activityStats.ts app/src/lib/activityAggregates.ts app/src/lib/*.test.ts
git commit -m "refactor: parameterize activity aggregations over window length"
```

---

### Task 9: `DateRangePicker`-Atom mit Presets

**Files:**

- Create: `app/src/components/atoms/DateRangePicker/index.tsx`
- Modify: `app/src/lib/constants/testIds.constants.ts` — `activity.rangePicker`-Block
- Modify: `app/src/i18n/locales/en/common.json` + `app/src/i18n/locales/de/common.json`
- Test: `app/src/components/atoms/DateRangePicker/DateRangePicker.test.tsx`

- [ ] **Step 1: Test-IDs + i18n-Keys**

`testIds.constants.ts` (Struktur an den bestehenden `activity.*`-Block anlehnen):

```ts
rangePicker: {
  root: "activity-range-picker",
  preset: (p: string) => `activity-range-preset-${p}`,
  sinceInput: "activity-range-since",
  untilInput: "activity-range-until",
},
```

`common.json` (en):

```json
"activity": {
  "range": {
    "preset_7d": "7d",
    "preset_30d": "30d",
    "preset_90d": "90d",
    "preset_1y": "1y",
    "preset_all": "All",
    "since": "From",
    "until": "Until",
    "truncated_banner": "Range trimmed — shrink the range for complete data."
  }
}
```

`de`-Pendant: `"preset_all": "Alles"`, `"since": "Von"`, `"until": "Bis"`, `"truncated_banner": "Zeitraum gekürzt — Range verkleinern für vollständige Daten."` (übrige Presets identisch).

- [ ] **Step 2: Failing Component-Test (nur `data-testid`-Selektion!)**

```tsx
// app/src/components/atoms/DateRangePicker/DateRangePicker.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DateRangePicker from "@/components/atoms/DateRangePicker";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

const range = { since: "2026-05-01T00:00:00.000Z", until: "2026-06-01T00:00:00.000Z" };

describe("DateRangePicker", () => {
  it("renders preset chips and fires onChange for 90d", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={range} onChange={onChange} oldestDate={null} />);
    fireEvent.click(screen.getByTestId(TEST_IDS.activity.rangePicker.preset("90d")));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0];
    const days = (new Date(next.until).getTime() - new Date(next.since).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(90);
  });

  it("disables the all preset without an oldest date", () => {
    render(<DateRangePicker value={range} onChange={vi.fn()} oldestDate={null} />);
    expect(screen.getByTestId(TEST_IDS.activity.rangePicker.preset("all"))).toBeDisabled();
  });

  it("uses oldestDate as since for the all preset", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker value={range} onChange={onChange} oldestDate="2024-01-15T00:00:00.000Z" />,
    );
    fireEvent.click(screen.getByTestId(TEST_IDS.activity.rangePicker.preset("all")));
    expect(onChange.mock.calls[0]![0].since).toBe("2024-01-15T00:00:00.000Z");
  });

  it("applies manual date input changes", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={range} onChange={onChange} oldestDate={null} />);
    fireEvent.change(screen.getByTestId(TEST_IDS.activity.rangePicker.sinceInput), {
      target: { value: "2026-04-01" },
    });
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run — FAIL**

Run: `yarn workspace @recrest/app test src/components/atoms/DateRangePicker`
Expected: FAIL

- [ ] **Step 4: Implementierung**

Aufbau (alles `styled()`, kein `sx`; Buttons über `GeneralButton`/`GeneralButtonGroup` aus `atoms/buttons/`; native `<input type="date">` analog zum `NumberInput`-Pattern in `SystemSection` mit `eslint-disable`-Begründung):

```tsx
// app/src/components/atoms/DateRangePicker/index.tsx
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import type { ActivityRange } from "@recrest/shared";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

const DAY_MS = 86_400_000;
const PRESETS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "1y", days: 365 },
] as const;

interface Props {
  value: ActivityRange;
  onChange: (next: ActivityRange) => void;
  /** Oldest commit timestamp across repos; `null` disables the `all` preset. */
  oldestDate: string | null;
}

const Root = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

// eslint-disable-next-line no-restricted-syntax -- native date input required for the OS date popover
const DateInput = styled("input")(({ theme }) => ({
  height: 28,
  padding: "0 8px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));

function isoAtMidnight(dateInputValue: string): string {
  return new Date(`${dateInputValue}T00:00:00`).toISOString();
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
}

function DateRangePicker({ value, onChange, oldestDate }: Props) {
  const { t } = useTranslation();
  const applyPreset = (days: number) => {
    const until = new Date();
    onChange({
      since: new Date(until.getTime() - days * DAY_MS).toISOString(),
      until: until.toISOString(),
    });
  };
  return (
    <Root data-testid={TEST_IDS.activity.rangePicker.root}>
      {PRESETS.map((p) => (
        <GeneralButton
          key={p.key}
          size="xs"
          variant="subtle"
          onClick={() => applyPreset(p.days)}
          data-testid={TEST_IDS.activity.rangePicker.preset(p.key)}
        >
          {t(`activity.range.preset_${p.key}`)}
        </GeneralButton>
      ))}
      <GeneralButton
        size="xs"
        variant="subtle"
        disabled={!oldestDate}
        onClick={() =>
          oldestDate && onChange({ since: oldestDate, until: new Date().toISOString() })
        }
        data-testid={TEST_IDS.activity.rangePicker.preset("all")}
      >
        {t("activity.range.preset_all")}
      </GeneralButton>
      <DateInput
        type="date"
        value={toDateInputValue(value.since)}
        aria-label={t("activity.range.since")}
        onChange={(e) => onChange({ ...value, since: isoAtMidnight(e.target.value) })}
        data-testid={TEST_IDS.activity.rangePicker.sinceInput}
      />
      <DateInput
        type="date"
        value={toDateInputValue(value.until)}
        aria-label={t("activity.range.until")}
        onChange={(e) => onChange({ ...value, until: isoAtMidnight(e.target.value) })}
        data-testid={TEST_IDS.activity.rangePicker.untilInput}
      />
    </Root>
  );
}

export default DateRangePicker;
```

`GeneralButton`-Props vorher gegen die echte Komponente prüfen (`app/src/components/atoms/buttons/GeneralButton/index.tsx`) und Größen-/Variant-Namen exakt übernehmen.

- [ ] **Step 5: Run — PASS**

Run: `yarn workspace @recrest/app test src/components/atoms/DateRangePicker`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add app/src/components/atoms/DateRangePicker app/src/lib/constants/testIds.constants.ts app/src/i18n/locales
git commit -m "feat: add date range picker atom with presets"
```

---

### Task 10: Activity-Page auf Range-Datenfluss umstellen (inkl. URL-Sync + Truncation-Banner)

**Files:**

- Modify: `app/src/pages/app/Activity/index.tsx`
- Modify: `app/src/lib/constants/` — URL-Param-Namen als Constants (`ACTIVITY_URL_PARAM_SINCE = "since"`, `ACTIVITY_URL_PARAM_UNTIL = "until"`; passende Datei per `ls app/src/lib/constants` wählen, Layering-README beachten)

- [ ] **Step 1: Datenfluss tauschen**

In `ActivityPage`:

1. `useRecentCommits({ days: ACTIVITY_DAYS })` → `useActivityCommits()`.
2. `const range = useAppSelector(selectSelectedRange);` + `windowDays = Math.max(1, Math.ceil((Date.parse(range.until) - Date.parse(range.since)) / 86_400_000))`.
3. `windowDays` an alle parametrisierten Aggregations aus Task 8 durchreichen (`computeActivityStats(filteredCommits, today, allRepoIds, windowDays)` usw.).
4. `<DateRangePicker value={range} onChange={(r) => dispatch(setSelectedRange(r))} oldestDate={oldest} />` in die `FilterRow`; `oldest` aus `s.activity.oldestCommitDate`, beim Mount `dispatch(fetchOldestCommitDate())`.
5. URL-Sync via `useSearchParams` (react-router): beim Mount `?since/?until` lesen → `setSelectedRange`; bei Range-Änderung Params schreiben (replace, nicht push).
6. Truncation-Banner: wenn `truncated` aus dem Hook `true` → schlanke `styled(Box)`-Banner-Zeile über dem Grid mit `t("activity.range.truncated_banner")` und `data-testid={TEST_IDS.activity.truncatedBanner}` (Constant ergänzen).

- [ ] **Step 2: Verifikation**

Run: `yarn test:ts && yarn lint && yarn workspace @recrest/app test src/pages/app/Activity`
Expected: PASS (bestehende Page-Tests grün; falls Page-Tests `useRecentCommits` mocken, Mock auf `useActivityCommits` umziehen)

- [ ] **Step 3: Manueller Smoke (Web-Modus reicht für Layout)**

Run: `yarn dev:web` → `http://localhost:3000` → Activity-Page: Picker rendert, Presets klickbar, URL-Params ändern sich.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/app/Activity app/src/lib/constants
git commit -m "feat: drive activity page from range-based commit flow"
```

---

### Task 11: `insights.ts` — sechs Pure Functions

**Files:**

- Create: `app/src/lib/insights.ts`
- Test: `app/src/lib/insights.test.ts`
- Modify: `app/vitest.config.ts` — `test.env: { TZ: "Europe/Berlin" }` für deterministische Local-Day-Buckets

**Timezone-Konvention (kritisch):** Day-Buckets in **lokaler TZ** via `new Date(c.timestamp).toLocaleDateString("en-CA")` → `YYYY-MM-DD`-Key **vor** jedem Bucketing. Jede Funktion dokumentiert das im JSDoc.

- [ ] **Step 1: `vitest.config.ts` um TZ ergänzen**

```ts
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src-old/**", "node_modules", "dist"],
    env: { TZ: "Europe/Berlin" },
  },
```

- [ ] **Step 2: Failing Tests**

```ts
// app/src/lib/insights.test.ts
import { describe, expect, it } from "vitest";

import type { RecentCommit } from "@recrest/shared";

import {
  computeAvgCommitsPerWeek,
  computeLongestGap,
  computeMostActiveDayOfWeek,
  computeStreaks,
  computeTopAuthorsByPeriod,
  computeTrend,
} from "@/lib/insights";

const c = (ts: string, author = "alice"): RecentCommit => ({
  sha: ts + author,
  summary: "s",
  author,
  authorEmail: null,
  timestamp: ts,
  repoId: "r",
  repoName: "repo",
});

const TODAY = new Date("2026-06-01T12:00:00");

describe("computeStreaks", () => {
  it("handles empty input", () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, longest: 0, longestRange: null });
  });

  it("counts a current streak ending today", () => {
    const commits = [
      c("2026-06-01T08:00:00Z"),
      c("2026-05-31T08:00:00Z"),
      c("2026-05-30T08:00:00Z"),
    ];
    expect(computeStreaks(commits, TODAY).current).toBe(3);
  });

  it("current streak breaks on a gap day", () => {
    const commits = [c("2026-06-01T08:00:00Z"), c("2026-05-30T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).current).toBe(1);
  });

  it("finds the longest historical streak with its range", () => {
    const commits = [
      c("2026-03-01T08:00:00Z"),
      c("2026-03-02T08:00:00Z"),
      c("2026-03-03T08:00:00Z"),
      c("2026-03-04T08:00:00Z"),
      c("2026-06-01T08:00:00Z"),
    ];
    const { longest, longestRange } = computeStreaks(commits, TODAY);
    expect(longest).toBe(4);
    expect(longestRange).toEqual({ start: "2026-03-01", end: "2026-03-04" });
  });

  it("buckets UTC evening commits into the local (Berlin) next day", () => {
    // 23:30 UTC = 01:30 Berlin (CEST) next day.
    const commits = [c("2026-05-31T23:30:00Z"), c("2026-06-01T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).current).toBe(1); // both on local 2026-06-01
  });
});

describe("computeTrend", () => {
  it("flags up when this period beats the previous by >=5%", () => {
    const commits = [
      ...Array.from({ length: 10 }, (_, i) =>
        c(`2026-05-${String(25 + (i % 7)).padStart(2, "0")}T0${i % 9}:00:00Z`, `a${i}`),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        c(`2026-05-${String(18 + (i % 7)).padStart(2, "0")}T1${i % 9}:00:00Z`, `b${i}`),
      ),
    ];
    const trend = computeTrend(commits, 7, TODAY);
    expect(trend.direction).toBe("up");
    expect(trend.deltaPct).toBeGreaterThan(5);
  });

  it("is flat below the 5% threshold", () => {
    const commits = [c("2026-05-30T08:00:00Z"), c("2026-05-22T08:00:00Z")];
    expect(computeTrend(commits, 7, TODAY).direction).toBe("flat");
  });
});

describe("computeTopAuthorsByPeriod", () => {
  it("ranks authors by commit count inside the period", () => {
    const commits = [
      c("2026-05-30T08:00:00Z", "bob"),
      c("2026-05-30T09:00:00Z", "bob"),
      c("2026-05-30T10:00:00Z", "alice"),
      c("2026-01-01T10:00:00Z", "carol"),
    ];
    const top = computeTopAuthorsByPeriod(commits, 30, 2, TODAY);
    expect(top.map((a) => a.author)).toEqual(["bob", "alice"]);
    expect(top[0]?.count).toBe(2);
  });
});

describe("computeMostActiveDayOfWeek", () => {
  it("returns local weekday index with count", () => {
    // 2026-05-25 is a Monday.
    const commits = [
      c("2026-05-25T08:00:00Z"),
      c("2026-05-25T09:00:00Z"),
      c("2026-05-26T08:00:00Z"),
    ];
    expect(computeMostActiveDayOfWeek(commits)).toEqual({ day: 1, count: 2 }); // 1 = Monday (JS getDay)
  });

  it("returns null for empty input", () => {
    expect(computeMostActiveDayOfWeek([])).toBeNull();
  });
});

describe("computeAvgCommitsPerWeek", () => {
  it("averages over the spanned weeks", () => {
    const commits = [
      c("2026-05-18T08:00:00Z"),
      c("2026-05-25T08:00:00Z"),
      c("2026-06-01T08:00:00Z"),
    ];
    // 3 commits over exactly 2 weeks span → 1.5
    expect(computeAvgCommitsPerWeek(commits)).toBeCloseTo(1.5, 1);
  });

  it("single commit counts as one week", () => {
    expect(computeAvgCommitsPerWeek([c("2026-05-18T08:00:00Z")])).toBe(1);
  });
});

describe("computeLongestGap", () => {
  it("finds the longest run of local days without a commit", () => {
    const commits = [
      c("2026-05-01T08:00:00Z"),
      c("2026-05-10T08:00:00Z"),
      c("2026-05-12T08:00:00Z"),
    ];
    expect(computeLongestGap(commits)).toEqual({
      startDate: "2026-05-02",
      endDate: "2026-05-09",
      days: 8,
    });
  });

  it("returns null when there is no gap or fewer than 2 commits", () => {
    expect(computeLongestGap([c("2026-05-01T08:00:00Z")])).toBeNull();
  });
});
```

- [ ] **Step 3: Run — FAIL**

Run: `yarn workspace @recrest/app test src/lib/insights.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implementierung**

```ts
// app/src/lib/insights.ts
import type { RecentCommit } from "@recrest/shared";

/**
 * Insight aggregations over the full loaded commit range (Plan 04/01 §C.3).
 *
 * Timezone convention: all day-buckets use the USER'S LOCAL timezone, not
 * UTC — "streak = I commit every day" matches the user's life rhythm, not
 * the UTC clock. Keys are `YYYY-MM-DD` via `toLocaleDateString("en-CA")`.
 */

const DAY_MS = 86_400_000;

/** Local-tz `YYYY-MM-DD` bucket key. */
function localDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function localDayKeyOf(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

/** Parses a `YYYY-MM-DD` key back to a local-midnight Date. */
function fromDayKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

function sortedUniqueDayKeys(commits: readonly RecentCommit[]): string[] {
  return Array.from(new Set(commits.map((c) => localDayKey(c.timestamp)))).sort();
}

export interface Streaks {
  current: number;
  longest: number;
  longestRange: { start: string; end: string } | null;
}

/** Consecutive local days with >=1 commit. `current` runs up to `today`
 *  (a commit today or yesterday keeps it alive — today may not be over). */
export function computeStreaks(commits: readonly RecentCommit[], today: Date): Streaks {
  const keys = sortedUniqueDayKeys(commits);
  if (keys.length === 0) return { current: 0, longest: 0, longestRange: null };
  const keySet = new Set(keys);

  let longest = 0;
  let longestRange: Streaks["longestRange"] = null;
  let runStart = 0;
  for (let i = 0; i < keys.length; i++) {
    const prev = i > 0 ? fromDayKey(keys[i - 1]!).getTime() : null;
    const cur = fromDayKey(keys[i]!).getTime();
    if (prev === null || Math.round((cur - prev) / DAY_MS) !== 1) runStart = i;
    const len = i - runStart + 1;
    if (len > longest) {
      longest = len;
      longestRange = { start: keys[runStart]!, end: keys[i]! };
    }
  }

  let current = 0;
  const cursor = new Date(today);
  if (!keySet.has(localDayKeyOf(cursor))) cursor.setDate(cursor.getDate() - 1); // today not over yet
  while (keySet.has(localDayKeyOf(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest, longestRange };
}

export interface Trend {
  direction: "up" | "down" | "flat";
  deltaPct: number;
}

/** `[today - periodDays, today]` vs `[today - 2*periodDays, today - periodDays)`.
 *  `flat` below a 5% absolute delta. Day boundaries in local tz. */
export function computeTrend(
  commits: readonly RecentCommit[],
  periodDays: number,
  today: Date,
): Trend {
  const todayKey = localDayKeyOf(today);
  const edge = new Date(today);
  edge.setDate(edge.getDate() - periodDays);
  const edgeKey = localDayKeyOf(edge);
  const prevEdge = new Date(today);
  prevEdge.setDate(prevEdge.getDate() - 2 * periodDays);
  const prevEdgeKey = localDayKeyOf(prevEdge);

  let cur = 0;
  let prev = 0;
  for (const c of commits) {
    const k = localDayKey(c.timestamp);
    if (k > edgeKey && k <= todayKey) cur += 1;
    else if (k > prevEdgeKey && k <= edgeKey) prev += 1;
  }
  const deltaPct = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
  const direction = Math.abs(deltaPct) < 5 ? "flat" : deltaPct > 0 ? "up" : "down";
  return { direction, deltaPct };
}

export interface TopAuthor {
  author: string;
  email: string | null;
  count: number;
}

export function computeTopAuthorsByPeriod(
  commits: readonly RecentCommit[],
  periodDays: number,
  limit: number,
  today: Date,
): TopAuthor[] {
  const edge = new Date(today);
  edge.setDate(edge.getDate() - periodDays);
  const edgeKey = localDayKeyOf(edge);
  const byAuthor = new Map<string, TopAuthor>();
  for (const c of commits) {
    if (localDayKey(c.timestamp) <= edgeKey) continue;
    const entry = byAuthor.get(c.author) ?? { author: c.author, email: c.authorEmail, count: 0 };
    entry.count += 1;
    byAuthor.set(c.author, entry);
  }
  return Array.from(byAuthor.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Local weekday (JS `getDay()`: 0=Sun..6=Sat) with the highest commit count. */
export function computeMostActiveDayOfWeek(
  commits: readonly RecentCommit[],
): { day: number; count: number } | null {
  if (commits.length === 0) return null;
  const counts = Array.from({ length: 7 }, () => 0);
  for (const c of commits) {
    const day = new Date(c.timestamp).getDay();
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const max = Math.max(...counts);
  return { day: counts.indexOf(max), count: max };
}

/** Commits per week averaged over the local-day span first→last commit. */
export function computeAvgCommitsPerWeek(commits: readonly RecentCommit[]): number {
  if (commits.length === 0) return 0;
  const keys = sortedUniqueDayKeys(commits);
  const spanDays =
    Math.round(
      (fromDayKey(keys[keys.length - 1]!).getTime() - fromDayKey(keys[0]!).getTime()) / DAY_MS,
    ) + 1;
  const weeks = Math.max(1, spanDays / 7);
  return commits.length / weeks;
}

export interface LongestGap {
  startDate: string;
  endDate: string;
  days: number;
}

/** Longest run of local days WITHOUT a commit between first and last commit;
 *  `days` counts both boundary gap days inclusively. */
export function computeLongestGap(commits: readonly RecentCommit[]): LongestGap | null {
  const keys = sortedUniqueDayKeys(commits);
  if (keys.length < 2) return null;
  let best: LongestGap | null = null;
  for (let i = 1; i < keys.length; i++) {
    const prev = fromDayKey(keys[i - 1]!);
    const cur = fromDayKey(keys[i]!);
    const gapDays = Math.round((cur.getTime() - prev.getTime()) / DAY_MS) - 1;
    if (gapDays <= 0) continue;
    const start = new Date(prev);
    start.setDate(start.getDate() + 1);
    const end = new Date(cur);
    end.setDate(end.getDate() - 1);
    if (!best || gapDays > best.days) {
      best = { startDate: localDayKeyOf(start), endDate: localDayKeyOf(end), days: gapDays };
    }
  }
  return best;
}
```

- [ ] **Step 5: Run — PASS**

Run: `yarn workspace @recrest/app test src/lib/insights.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/insights.ts app/src/lib/insights.test.ts app/vitest.config.ts
git commit -m "feat: add insights aggregation module with local-tz day buckets"
```

---

### Task 12: Insight-Cards + Grid-Block auf der Activity-Page

**Files:**

- Create: `app/src/components/organisms/activity/cards/insights/StreakInsightCard/index.tsx`
- Create: `.../insights/TrendInsightCard/index.tsx`
- Create: `.../insights/TopAuthorsInsightCard/index.tsx`
- Create: `.../insights/ActiveWeekdayInsightCard/index.tsx`
- Create: `.../insights/AvgPerWeekInsightCard/index.tsx`
- Create: `.../insights/LongestGapInsightCard/index.tsx`
- Modify: `app/src/pages/app/Activity/index.tsx` — neuer Block "Insights" (Grid 3×2, je `cols={4}`)
- Modify: `app/src/lib/constants/testIds.constants.ts` — `activity.cards.insights.*`
- Modify: `app/src/i18n/locales/{en,de}/common.json` — Titel/Sub/Werte-Keys
- Test: je Card ein kompakter Component-Test (`*.test.tsx`, nur `data-testid`)

**Pattern pro Card** (alle sechs identisch aufgebaut; `GeneralCard`-Chrome wie bei `StreakCard`/`BusiestPeakCard` — vorher eine davon lesen und Props exakt übernehmen). Beispiel `TrendInsightCard`:

```tsx
import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { Trend } from "@/lib/insights";

interface Props {
  trend: Trend;
  periodDays: number;
  loading?: boolean;
}

const Value = styled(Typography)(({ theme }) => ({
  fontSize: 26,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

const Caption = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

function TrendInsightCard({ trend, periodDays, loading }: Props) {
  const { t } = useTranslation();
  const arrow = trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "▶";
  return (
    <GeneralCard
      title={t("activity.insights.trend_title")}
      sub={t("activity.insights.trend_sub", { days: periodDays })}
      loading={loading}
      testId={TEST_IDS.activity.cards.insights.trend}
    >
      <Box>
        <Value component="p">{`${arrow} ${Math.abs(Math.round(trend.deltaPct))}%`}</Value>
        <Caption component="p">{t(`activity.insights.trend_${trend.direction}`)}</Caption>
      </Box>
    </GeneralCard>
  );
}

export default TrendInsightCard;
```

- [ ] **Step 1: Test-IDs + i18n-Keys für alle sechs Cards anlegen** (`streak`, `trend`, `topAuthors`, `activeWeekday`, `avgPerWeek`, `longestGap`)
- [ ] **Step 2: Pro Card failing Component-Test → implementieren → Test grün** (Reihenfolge frei, eine Card nach der anderen; Wochentags-Label via `toLocaleDateString(undefined, { weekday: "long" })` aus dem `day`-Index ableiten)
- [ ] **Step 3: Activity-Page: Insights-Block**

```tsx
const insights = useMemo(
  () => ({
    streaks: computeStreaks(filteredCommits, today),
    trend: computeTrend(filteredCommits, 30, today),
    topAuthors: computeTopAuthorsByPeriod(filteredCommits, 30, 3, today),
    weekday: computeMostActiveDayOfWeek(filteredCommits),
    avgPerWeek: computeAvgCommitsPerWeek(filteredCommits),
    gap: computeLongestGap(filteredCommits),
  }),
  [filteredCommits, today],
);
```

Sechs `<Span cols={4}>`-Zellen zwischen Hero und bestehendem Grid (oder als eigener `Grid`-Block mit Überschrift `t("activity.insights.section_title")`).

- [ ] **Step 4: Verifikation**

Run: `yarn workspace @recrest/app test src/components/organisms/activity/cards/insights && yarn test:ts && yarn lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/organisms/activity/cards/insights app/src/pages/app/Activity app/src/lib/constants app/src/i18n
git commit -m "feat: add insight cards grid to activity page"
```

---

### Task 13: Nivo-Migration — Linien-Charts (`PrVelocityCard`, `CiPassRateCard`, Dashboard-`ActivityChart`)

**Files:**

- Modify: `app/src/components/organisms/activity/cards/PrVelocityCard/index.tsx`
- Modify: `app/src/components/organisms/activity/cards/CiPassRateCard/index.tsx`
- Modify: `app/src/pages/app/Dashboard/parts/ActivityChart/index.tsx`
- Tests: bestehende Card-Tests der drei Komponenten (per `rg -l "prVelocity|ciPassRate|activityChart" app/src --glob "*.test.tsx"`)

**Referenz-Umbau `PrVelocityCard`** (die anderen beiden folgen demselben Muster mit ihren Datenformen `PassRateDay[]` bzw. Dashboard-Tagesserie):

```tsx
import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { VelocityDay } from "@/lib/activityAggregates";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  rows: VelocityDay[];
  loading?: boolean;
}

const ChartWrap = styled(Box)({
  width: "100%",
  height: 160,
});

function PrVelocityCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const chronological = [...rows].reverse();
  const data = [
    {
      id: t("activity.cards.pr_velocity_opened"),
      data: chronological.map((r, i) => ({ x: i, y: r.opened })),
    },
    {
      id: t("activity.cards.pr_velocity_merged"),
      data: chronological.map((r, i) => ({ x: i, y: r.merged })),
    },
  ];
  return (
    <GeneralCard
      title={t("activity.cards.pr_velocity_title")}
      sub={t("activity.cards.pr_velocity_sub")}
      loading={loading}
      skeleton="line"
      testId={TEST_IDS.activity.cards.prVelocity}
    >
      <ChartWrap>
        <ResponsiveLine
          data={data}
          theme={nivoTheme}
          colors={[theme.palette.primary.main, theme.palette.success.main]}
          margin={{ top: 8, right: 8, bottom: 24, left: 28 }}
          curve="monotoneX"
          enablePoints={false}
          enableGridX={false}
          axisBottom={null}
          axisLeft={{ tickValues: 4 }}
          useMesh
          legends={[
            {
              anchor: "bottom-left",
              direction: "row",
              translateY: 24,
              itemWidth: 90,
              itemHeight: 14,
              symbolSize: 8,
              symbolShape: "circle",
            },
          ]}
        />
      </ChartWrap>
    </GeneralCard>
  );
}

export default PrVelocityCard;
```

- [ ] **Step 1: Bestehende Tests der drei Cards lesen** — sie selektieren über `data-testid`, die Card-Wrapper-IDs bleiben unverändert; nur Assertions auf SVG-Interna (z. B. `path`-Counts) müssen auf Existenz-Checks des Card-Bodies reduziert werden.
- [ ] **Step 2: `PrVelocityCard` umbauen** (Code oben), Test grün: `yarn workspace @recrest/app test src/components/organisms/activity/cards/PrVelocityCard`
- [ ] **Step 3: `CiPassRateCard` umbauen** — `PassRateDay[]` → eine Serie `rate` (0..1, y-Format `>-.0%`), gleiche `ResponsiveLine`-Props; vorher Datei lesen, Zusatz-Elemente (Repo-Breakdown-Liste) unangetastet lassen.
- [ ] **Step 4: Dashboard-`ActivityChart` umbauen** — Datei zuerst lesen (`app/src/pages/app/Dashboard/parts/ActivityChart/index.tsx`), Tagesserie auf eine `ResponsiveLine` mit `curve="monotoneX"` heben; Range kommt nach Task 10 weiter aus dem Slice-Default (30d).
- [ ] **Step 5: Verifikation**

Run: `yarn workspace @recrest/app test src/components/organisms/activity/cards src/pages/app/Dashboard && yarn test:ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/components/organisms/activity/cards/PrVelocityCard app/src/components/organisms/activity/cards/CiPassRateCard app/src/pages/app/Dashboard
git commit -m "feat: migrate line charts to nivo"
```

---

### Task 14: Nivo-Migration — `StackedChartCard` (Bar) + `LanguageDonutCard` (Pie)

**Files:**

- Modify: `app/src/components/organisms/activity/cards/StackedChartCard/index.tsx`
- Modify: `app/src/components/organisms/activity/cards/LanguageDonutCard/index.tsx`

- [ ] **Step 1: `StackedChartCard` → `ResponsiveBar`**

`StackedDay[]` (`{ day, total, segments: [{ repoId, repoName, count, color }] }`) wird zu Nivo-Bar-Rows transformiert — keys = Repo-Namen, Farben aus den Segment-Farben (die bereits aus `palette.ts` stammen):

```tsx
const chronological = [...stacked].reverse();
const repoNames = Array.from(
  new Set(chronological.flatMap((d) => d.segments.map((s) => s.repoName))),
);
const colorByRepo = new Map(
  chronological.flatMap((d) => d.segments.map((s) => [s.repoName, s.color] as const)),
);
const data = chronological.map((d, i) => ({
  day: String(i),
  ...Object.fromEntries(d.segments.map((s) => [s.repoName, s.count])),
}));
// ...
<ResponsiveBar
  data={data}
  keys={repoNames}
  indexBy="day"
  theme={nivoTheme}
  colors={(bar) => colorByRepo.get(String(bar.id)) ?? theme.palette.primary.main}
  margin={{ top: 8, right: 8, bottom: 20, left: 28 }}
  padding={0.35}
  borderRadius={2}
  enableLabel={false}
  axisBottom={null}
  axisLeft={{ tickValues: 4 }}
/>;
```

- [ ] **Step 2: `LanguageDonutCard` → `ResponsivePie`**

`LanguageSlice[]` (`{ language, color, share, commits }`) direkt mappen; `donutArcs`-Import entfällt:

```tsx
const data = mix.map((s) => ({ id: s.language, value: s.commits, color: s.color }));
// ...
<ResponsivePie
  data={data}
  theme={nivoTheme}
  colors={{ datum: "data.color" }}
  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
  innerRadius={0.7}
  padAngle={1.5}
  cornerRadius={3}
  enableArcLabels={false}
  enableArcLinkLabels={false}
/>;
```

Bestehende Legende/Center-Label der Card beibehalten (Datei lesen, nur den SVG-Teil ersetzen).

- [ ] **Step 3: Tests der beiden Cards anpassen + grün**

Run: `yarn workspace @recrest/app test src/components/organisms/activity/cards/StackedChartCard src/components/organisms/activity/cards/LanguageDonutCard`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/components/organisms/activity/cards/StackedChartCard app/src/components/organisms/activity/cards/LanguageDonutCard
git commit -m "feat: migrate stacked bar and language donut to nivo"
```

---

### Task 15: Nivo-Migration — `HeatmapCard`, `AuthorClockCard`, `CiHealthHero`

**Files:**

- Modify: `app/src/components/organisms/activity/cards/HeatmapCard/index.tsx`
- Modify: `app/src/components/organisms/activity/cards/AuthorClockCard/index.tsx`
- Modify: `app/src/components/organisms/activity/cards/CiHealthHero/index.tsx` + `CiHealthHero.styles.tsx`

- [ ] **Step 1: `HeatmapCard` → `ResponsiveHeatMap`**

`HeatmapMatrix` ist `number[][]` (7 Wochentage Mon-first × 24 Stunden):

```tsx
import { ResponsiveHeatMap } from "@nivo/heatmap";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const data = matrix.map((row, weekday) => ({
  id: WEEKDAYS[weekday]!,
  data: row.map((count, hour) => ({ x: String(hour), y: count })),
}));
// ...
<ResponsiveHeatMap
  data={data}
  theme={nivoTheme}
  margin={{ top: 4, right: 4, bottom: 20, left: 34 }}
  colors={{
    type: "sequential",
    colors: [theme.palette.background.default, theme.palette.primary.main],
  }}
  emptyColor={theme.palette.background.default}
  enableLabels={false}
  axisTop={null}
  axisBottom={{ tickValues: ["0", "6", "12", "18"] }}
  borderRadius={2}
  hoverTarget="cell"
/>;
```

Wochentags-Labels über i18n lokalisieren, falls die Card das heute schon tut (Datei lesen).

- [ ] **Step 2: `AuthorClockCard` → `ResponsiveBar`** — `hours: number[]` (24 Werte) als 24-Spalten-Bar (`data = hours.map((count, h) => ({ hour: String(h), count }))`, `keys={["count"]}`, `indexBy="hour"`).
- [ ] **Step 3: `CiHealthHero`** — Datei lesen; der SVG-Anteil ist ein Ring/Gauge → `ResponsivePie` mit `innerRadius={0.8}`, zwei Slices (passed/failed) in `theme.palette.success.main`/`theme.palette.error.main`, Center-Label als absolut positioniertes `styled(Typography)` beibehalten.
- [ ] **Step 4: Tests anpassen + grün**

Run: `yarn workspace @recrest/app test src/components/organisms/activity/cards/HeatmapCard src/components/organisms/activity/cards/AuthorClockCard src/components/organisms/activity/cards/CiHealthHero`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/organisms/activity/cards
git commit -m "feat: migrate heatmap, author clock and ci gauge to nivo"
```

---

### Task 16: Tote Chart-Helper entfernen + Abschluss-Verifikation

**Files:**

- Delete: `app/src/lib/charts/smoothLine.ts` (+ zugehöriger Test)
- Delete: `app/src/lib/charts/donutArcs.ts` (+ zugehöriger Test)
- Keep: `app/src/lib/charts/palette.ts`, `app/src/lib/charts/nivoTheme.ts`

- [ ] **Step 1: Keine Rest-Importe verifizieren**

Run: `rg "smoothLine|smoothSeries|donutArcs|monotoneCubic" app/src --glob "!**/charts/**"`
Expected: keine Treffer. Falls doch → die Call-Site erst migrieren (zurück zu Task 13–15-Muster).

- [ ] **Step 2: Dateien löschen, dann volle Verifikation**

```bash
yarn typecheck && yarn lint
yarn workspace @recrest/app test src/lib/charts src/components/organisms/activity src/store src/pages/app/Activity
cargo test --manifest-path app/src-tauri/Cargo.toml
```

Expected: alles PASS.

- [ ] **Step 3: Manuelle Smokes (volles Tauri)**

`yarn dev` → Activity-Page:

- Preset `all` lädt volle History ohne UI-Hang (Chunks treffen sichtbar nach und nach ein).
- Truncation-Banner erscheint bei sehr großen Repos (Cap testweise auf 100 senken).
- Insight-Cards zeigen plausible Werte (Streak gegen `git log --format=%ad --date=short | sort -u` quervergleichen).
- Alle Charts folgen Dark/Light-Umschaltung ohne Reload.

- [ ] **Step 4: Commit**

```bash
git add -A app/src/lib/charts
git commit -m "chore: drop hand-rolled svg chart helpers after nivo migration"
```
