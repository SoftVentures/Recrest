# Plan 8 — Autonomous Tauri E2E Test Harness (`tauri-driver` + Linux container)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-backend, real-UI, end-to-end test harness that an automated agent (Claude / CI) can run unattended. The harness boots the full Tauri app (real Rust + real `git2` + real WebView), drives the UI via `tauri-driver` over WebDriver, talks to mock GitHub/GitLab/Bitbucket servers (no real network), and runs against an isolated profile so it never touches the user's repos, settings, or keychain.

**Why this plan exists.** Today's verification story is split into:

- `cargo test` — backend logic only, no IPC layer, no UI
- `vitest` — UI in jsdom, IPC stubbed, no real backend
- `playwright e2e` against `yarn dev:web` — UI in real Chrome, IPC stubbed via `devStub.ts`, no real backend
- Manual smoke against `yarn dev` (real Tauri) — the only path that exercises the full stack, but requires a human at the keyboard

The gap: nothing exercises **frontend ↔ Tauri IPC ↔ Rust ↔ git2/providers** end-to-end without a human. Every plan (06, 07, anything that follows) ends with a manual-smoke checkbox the maintainer has to walk through. This plan closes that gap.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Host (macOS dev box, or Linux CI)                              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Docker container (Ubuntu + webkit2gtk + Node + Rust)      │  │
│  │                                                           │  │
│  │  ┌──────────────────┐    WebDriver    ┌─────────────────┐ │  │
│  │  │ tauri-driver     │ ◄────────────►  │ WDIO test       │ │  │
│  │  │ (webkit2gtkwebdr)│                 │ runner          │ │  │
│  │  └────────┬─────────┘                 └─────────────────┘ │  │
│  │           │ launches                                       │  │
│  │  ┌────────▼─────────────────────────────────────────────┐ │  │
│  │  │ Recrest Tauri Linux build                            │ │  │
│  │  │ - $RECREST_TEST_PROFILE → isolated app_data_dir      │ │  │
│  │  │ - $RECREST_PROVIDER_BASE_URLS → mock-server URLs     │ │  │
│  │  │ - prefilled dev-tokens.json (test PATs)              │ │  │
│  │  └────────┬─────────────────────────────────────────────┘ │  │
│  │           │ HTTP                                           │  │
│  │  ┌────────▼─────────────────────────────────────────────┐ │  │
│  │  │ Mock provider servers (Express, port-forwarded)      │ │  │
│  │  │ - github.localhost:9001                              │ │  │
│  │  │ - gitlab.localhost:9002                              │ │  │
│  │  │ - bitbucket.localhost:9003                           │ │  │
│  │  │ Fixtures sourced from src-tauri/tests/fixtures/      │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Why Docker + Linux:** `tauri-driver` officially supports `webkit2gtk-webdriver` (Linux) and `MSEdgeDriver` (Windows). **macOS WKWebView has no WebDriver path** — Apple's `safaridriver` only exposes Safari proper, not WKWebView embedded in a third-party app. Appium Mac2Driver can drive WKWebView via accessibility, but it's flaky, slow, and platform-bound. Building Tauri for Linux inside Docker gives us a real Tauri stack (same Rust backend, same WebKit-family WebView) with a working WebDriver, runnable from anywhere. **Tradeoff:** macOS-specific behavior (Apple-grid icons, tray templating, WKWebView appearance polling, native menubar) is NOT exercised by this harness — those stay in the manual-smoke bucket. Everything else (backend logic, IPC, UI flows, provider integration) becomes automatable.

**Tech Stack:** Rust (existing, unchanged for app code), Docker, `tauri-driver` (Rust crate), `webdriverio` (Tauri's official E2E partner — Playwright doesn't speak WebDriver natively), Node 20 + Express + `nock`-style fixtures, `tempfile` (existing).

**Prerequisite:** Plan 1 Part A (Rust test harness with `tempfile` + `wiremock` — already shipped). Existing wiremock fixtures under `app/src-tauri/tests/fixtures/{github,gitlab,bitbucket}/` are the seed for the Express mock servers.

---

## E.1 — Test-profile isolation

### Task 1: `RECREST_TEST_PROFILE` env-var → isolated app_data_dir

**Files:**

- Modify: `app/src-tauri/src/identity.rs` (or wherever `app_data_dir` is computed)
- Modify: `app/src-tauri/src/auth/token.rs` (file-backend dev-tokens path lookup)
- Modify: `app/src-tauri/src/config/settings.rs` (settings.json path)

**Idea:** when `RECREST_TEST_PROFILE=<id>` is set at startup, every path that currently reads from `<app_data_dir>` reads from `<tmpdir>/recrest-test-<id>/` instead. Wipe on first launch (idempotent reset).

- [ ] **Step 1: Write the failing test** — `cargo test config::settings::tests::profile_env_redirects_paths`:

  ```rust
  #[test]
  fn profile_env_redirects_paths() {
      std::env::set_var("RECREST_TEST_PROFILE", "unit-test-abc");
      let path = settings_file_path();
      assert!(path.to_string_lossy().contains("recrest-test-unit-test-abc"));
      assert!(!path.to_string_lossy().contains("Application Support"));
      std::env::remove_var("RECREST_TEST_PROFILE");
  }
  ```

- [ ] **Step 2: Implement** — single helper `fn test_profile_root() -> Option<PathBuf>` reading the env-var; every callsite that currently does `app_data_dir.join(...)` checks this first:

  ```rust
  pub fn test_profile_root() -> Option<PathBuf> {
      std::env::var_os("RECREST_TEST_PROFILE").map(|id| {
          std::env::temp_dir().join(format!("recrest-test-{}", id.to_string_lossy()))
      })
  }

  pub fn settings_file_path() -> PathBuf {
      if let Some(root) = test_profile_root() {
          let _ = std::fs::create_dir_all(&root);
          return root.join("settings.json");
      }
      // existing logic
      ...
  }
  ```

- [ ] **Step 3: Wire the same indirection** into `dev_tokens_file_path()` and any other on-disk state (watcher cache, recent-commits cache, etc.). Audit by grepping for `app_data_dir`, `dirs::data_local_dir`, `dirs::config_dir`.

- [ ] **Step 4: Tests** — round-trip a `Settings` save/load with `RECREST_TEST_PROFILE=x`, assert the user's real `settings.json` is untouched.

- [ ] **Step 5: Commit** (`feat: RECREST_TEST_PROFILE env-var for isolated test state (E.1)`).

---

### Task 2: `RECREST_PROVIDER_BASE_URLS` → bypass keychain/config for test base URLs

**Files:**

- Modify: `app/src-tauri/src/providers/registry.rs` (provider construction)
- Modify: `app/src-tauri/src/providers/{github,gitlab,bitbucket}.rs` (read env-var at `new()`)

- [ ] **Step 1: Failing test** — provider constructed under `RECREST_PROVIDER_BASE_URLS=github=http://localhost:9001,gitlab=http://localhost:9002,bitbucket=http://localhost:9003` returns those URLs from `base_url()` without any `set_base_url` call.

- [ ] **Step 2: Parser** — small helper in `providers/mod.rs`:

  ```rust
  pub fn env_base_url_for(provider_id: &str) -> Option<String> {
      let raw = std::env::var("RECREST_PROVIDER_BASE_URLS").ok()?;
      raw.split(',').find_map(|kv| {
          let (k, v) = kv.split_once('=')?;
          (k.trim() == provider_id).then(|| v.trim().to_string())
      })
  }
  ```

- [ ] **Step 3:** Each provider's `new()` initializes its in-memory base_url from `env_base_url_for(PROVIDER_ID)` if present, falling back to the existing `set_base_url`-managed value or `API_BASE` constant. Order: env → keychain/config → built-in default. Document why env wins (test harness needs deterministic override that survives a `clear_provider_base_url`).

- [ ] **Step 4:** Commit (`feat: RECREST_PROVIDER_BASE_URLS env override for test mocks (E.1)`).

---

### Task 3: Token injection helper (test PATs into `dev-tokens.json`)

**Files:**

- Create: `tests/src/helpers/tokenInjection.ts`
- Modify: `app/src-tauri/src/auth/token.rs` (already file-backed in debug builds — no change expected, but verify the schema is stable)

- [ ] **Step 1:** TS helper that writes a `dev-tokens.json` at the test-profile path with seeded entries:

  ```ts
  export interface InjectedTokens {
    github?: { token: string; username?: string };
    gitlab?: { token: string; username?: string };
    bitbucket?: { token: string; username?: string };
  }

  export async function injectTokens(profileId: string, tokens: InjectedTokens): Promise<void> {
    const path = profilePath(profileId, "dev-tokens.json");
    const json = mapTokensToFileSchema(tokens); // matches token.rs's serde shape
    await fs.writeFile(path, JSON.stringify(json, null, 2), { mode: 0o600 });
  }
  ```

- [ ] **Step 2:** Schema-stability test — load the written file back via the Rust `TokenStore` and assert each provider reports `is_authenticated == true`. Add a cross-language schema fixture under `tests/fixtures/tokens/` so the TS writer and the Rust reader are pinned to the same JSON shape.

- [ ] **Step 3:** Commit (`feat: test token injection helper (E.1)`).

---

## E.2 — Mock provider HTTP servers

### Task 4: Express harness with provider-shaped routes

**Files:**

- Create: `tests/src/mocks/providers/index.ts` (server bootstrap)
- Create: `tests/src/mocks/providers/github.ts` (route handlers)
- Create: `tests/src/mocks/providers/gitlab.ts`
- Create: `tests/src/mocks/providers/bitbucket.ts`
- Create: `tests/src/mocks/providers/fixtures/` (symlink or copy from `app/src-tauri/tests/fixtures/{github,gitlab,bitbucket}/`)

**Idea:** one Express app per provider, listening on its own port. Each request matches against a route table; unmatched routes return 404 with a `[mock] no route for X` log line so test failures point at the missing stub.

- [ ] **Step 1: Route inventory.** Grep `app/src-tauri/src/providers/{github,gitlab,bitbucket}.rs` for every endpoint the real client hits (already ~30 across all three). Build a table:

  | Provider  | Method | Path                                       | Fixture                  |
  | --------- | ------ | ------------------------------------------ | ------------------------ |
  | github    | GET    | /repos/:o/:r/pulls                         | fixtures/github/pulls.json |
  | github    | PUT    | /repos/:o/:r/pulls/:n/merge                | fixtures/github/merge_ok.json |
  | github    | DELETE | /repos/:o/:r/git/refs/heads/:branch        | (204)                    |
  | gitlab    | GET    | /projects/:enc/merge_requests              | fixtures/gitlab/merge_requests.json |
  | gitlab    | PUT    | /projects/:enc/merge_requests/:n/merge     | fixtures/gitlab/merge_ok.json |
  | gitlab    | PUT    | /projects/:enc/merge_requests/:n/rebase    | (202)                    |
  | gitlab    | GET    | /projects/:enc/repository/branches/:b      | dynamic (404 if deleted) |
  | bitbucket | GET    | /repositories/:ws/:r/pullrequests          | fixtures/bitbucket/pullrequests.json |
  | bitbucket | POST   | /repositories/:ws/:r/pullrequests/:n/merge | fixtures/bitbucket/merge_ok.json |
  | …         | …      | …                                          | …                        |

- [ ] **Step 2: Express skeleton:**

  ```ts
  export function startMockGithub(port: number): http.Server {
    const app = express();
    app.use(express.json());
    app.get("/repos/:owner/:repo/pulls", (req, res) => {
      res.json(fixture("github/pulls.json"));
    });
    app.put("/repos/:owner/:repo/pulls/:n/merge", (req, res) => {
      // honor request body shape — body.merge_method must be one of {merge,squash,rebase}
      const valid = ["merge", "squash", "rebase"].includes(req.body?.merge_method);
      if (!valid) return res.status(400).json({ message: "invalid merge_method" });
      res.json({ sha: "mockmerge123", merged: true, message: "Mock merged" });
    });
    // ...
    app.use((req, res) => {
      console.error(`[mock-github] no route for ${req.method} ${req.path}`);
      res.status(404).json({ message: "not stubbed" });
    });
    return app.listen(port);
  }
  ```

- [ ] **Step 3: Mutable state per server.** Each server keeps a small in-memory object (`{ deletedBranches: Set<string>, mergedPrs: Map<number, MergedRecord> }`) so a test can: (a) merge a PR, (b) the next list call reflects the merge, (c) the branch DELETE call causes the branches endpoint to return 404. This is what makes flows like "after merge, the row flips to merged" actually testable.

- [ ] **Step 4: Per-test reset helper:**

  ```ts
  export class MockProviderSuite {
    private servers: { gh: http.Server; gl: http.Server; bb: http.Server };
    private state: MockState;
    async start(): Promise<{ githubUrl: string; gitlabUrl: string; bitbucketUrl: string }> { ... }
    reset(): void { this.state = freshState(); }
    async stop(): Promise<void> { ... }
  }
  ```

- [ ] **Step 5: Tests** — start the suite, hit each route with `fetch`, assert response shape matches what the real Rust client expects (deserializable into the Rust DTOs). Run the existing wiremock-backed cargo tests with the env-var pointing at the Express servers as a smoke check that contract drift surfaces.

- [ ] **Step 6: Commit** (`feat: Express mock servers for GitHub/GitLab/Bitbucket (E.2)`).

---

### Task 5: Failure-mode fixtures (rate-limit, conflict, protected-branch, auth-expired)

**Files:**

- Create: `tests/src/mocks/providers/scenarios.ts`

Each scenario flips a few of the in-memory flags so individual tests can assert error-handling paths without re-stubbing routes:

```ts
export const SCENARIOS = {
  github_pr_merge_conflict: { github: { mergeStatusCode: 405, mergeMessage: "Pull Request is not mergeable" } },
  gitlab_rebase_stuck: { gitlab: { rebaseInProgressForever: true } },
  gitlab_protected_branch: { gitlab: { deleteSucceedsButBranchSurvives: true } },
  bitbucket_rate_limit: { bitbucket: { rateLimitedUntil: Date.now() + 60_000 } },
  // … one per error path the real provider clients handle
};

mockSuite.applyScenario("gitlab_rebase_stuck");
```

- [ ] **Step 1:** Encode every failure path the Rust provider clients explicitly handle. Cross-reference: every `CommandError::bad_request(...)` branch in `providers/{github,gitlab,bitbucket}.rs` should have a matching scenario.

- [ ] **Step 2: Test** — applying a scenario then calling the route returns the configured failure response.

- [ ] **Step 3: Commit** (`feat: provider failure-mode scenarios (E.2)`).

---

## E.3 — Docker image + Tauri Linux build

### Task 6: `tests/docker/e2e.Dockerfile` — Ubuntu + Rust + webkit2gtk + Node + tauri-driver

**Files:**

- Create: `tests/docker/e2e.Dockerfile`
- Create: `tests/docker/entrypoint.sh`

Base: `ubuntu:24.04`. Layers:

1. apt: `libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libgtk-3-dev pkg-config build-essential webkit2gtk-driver xvfb` — webkit2gtk-driver is what `tauri-driver` actually shells out to on Linux
2. rustup (pinned to the project's `rust-toolchain.toml` if present, otherwise stable)
3. Node 20 (nodesource)
4. `cargo install tauri-driver`
5. Workdir = `/workspace`. Volume-mount the repo in.
6. Entrypoint: `xvfb-run -a /workspace/tests/docker/entrypoint.sh` — `xvfb` because webkit2gtk wants a display, even though we're headless.

- [ ] **Step 1: Write the Dockerfile.** Test build locally with `docker build -f tests/docker/e2e.Dockerfile -t recrest-e2e .` — must finish in under 15 min cold, under 90s warm.

- [ ] **Step 2: Entrypoint script.** Reads env vars (`$E2E_TEST_PROFILE`, `$E2E_TEST_SCENARIO`, etc.), builds the Tauri binary for Linux (`yarn workspace @recrest/app build:tauri --target x86_64-unknown-linux-gnu`), launches tauri-driver on 4444, launches Recrest with the profile env-vars + base-URL overrides set, then `npx wdio run wdio.conf.ts`.

- [ ] **Step 3: Cache layer.** Mount a named Docker volume at `~/.cargo/registry` + `target/` so subsequent runs don't recompile from scratch (Tauri cold-build is ~8 min; warm should be 30s).

- [ ] **Step 4: Verify** — `docker run --rm -v $PWD:/workspace recrest-e2e bash -c 'cargo --version && tauri-driver --version && webkit2gtk-driver --version'` returns versions for all three.

- [ ] **Step 5: Commit** (`feat: Docker image for Tauri E2E (E.3)`).

---

### Task 7: Linux Tauri build configuration

**Files:**

- Modify: `app/src-tauri/tauri.conf.json` (`bundle.targets.linux`)
- Create: `app/src-tauri/tauri.e2e.conf.json` (overlay — strips dev-only features that conflict with headless: skips updater, skips deep-link, sets `bundle.identifier = "com.recrest.e2e"`)
- Modify: `app/src-tauri/build.rs` if needed for Linux icon resource path

- [ ] **Step 1:** Verify `yarn workspace @recrest/app tauri:build --debug --target x86_64-unknown-linux-gnu` succeeds inside the Docker image. Resolve any platform-specific code paths that assume macOS (search `cfg(target_os = "macos")` and ensure Linux paths exist for everything the test needs).

- [ ] **Step 2:** Strip the Tauri tray + macOS appearance poller from the E2E overlay — `xvfb` doesn't have a real tray and the poller would just burn CPU. Gate with a `cfg(feature = "e2e-stripped")` or via the overlay config.

- [ ] **Step 3:** Commit (`feat: Tauri Linux/E2E build config (E.3)`).

---

## E.4 — WebDriverIO test runner

### Task 8: wdio config + harness

**Files:**

- Create: `tests/wdio.conf.ts`
- Create: `tests/src/e2e-tauri/fixtures/recrest.ts` (per-test fixture: starts mocks, starts Tauri, returns a `Page` wrapper)
- Modify: `tests/package.json` (`devDependencies`: `webdriverio`, `@wdio/cli`, `@wdio/local-runner`, `@wdio/mocha-framework`)

- [ ] **Step 1: `wdio.conf.ts`** — points at `http://localhost:4444` (tauri-driver). Capabilities:

  ```ts
  export const config: Options.Testrunner = {
    runner: "local",
    specs: ["./src/e2e-tauri/**/*.spec.ts"],
    capabilities: [{
      "tauri:options": { application: "/workspace/target/x86_64-unknown-linux-gnu/debug/recrest" },
      maxInstances: 1, // tauri-driver is single-session
    }],
    framework: "mocha",
    reporters: ["spec"],
    services: [],
    hostname: "localhost",
    port: 4444,
    waitforTimeout: 10_000,
  };
  ```

- [ ] **Step 2: Page wrapper** — thin abstraction over `browser.$` for the parts of the UI tests need to interact with (test-id selectors only, no CSS coupling). One method per high-level action: `openMergeModal(prNumber)`, `pickStrategy("squash")`, `confirmMerge()`, `expectRowState(prNumber, "merged")`.

- [ ] **Step 3: Per-test fixture** that wires everything:

  ```ts
  export async function startRecrestE2E(scenario?: keyof typeof SCENARIOS): Promise<{
    page: RecrestPage;
    mocks: MockProviderSuite;
    cleanup: () => Promise<void>;
  }> {
    const profileId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mocks = new MockProviderSuite();
    const urls = await mocks.start();
    if (scenario) mocks.applyScenario(scenario);

    await injectTokens(profileId, { github: { token: "test", username: "test-user" }, /* ... */ });
    await seedProfileRepos(profileId, /* sandbox repos with fake remotes */);

    process.env.RECREST_TEST_PROFILE = profileId;
    process.env.RECREST_PROVIDER_BASE_URLS =
      `github=${urls.githubUrl},gitlab=${urls.gitlabUrl},bitbucket=${urls.bitbucketUrl}`;

    // tauri-driver launches the binary; wdio's `browser` is the WebView session
    const page = new RecrestPage(browser);
    return {
      page,
      mocks,
      cleanup: async () => {
        await mocks.stop();
        await rmrf(profilePath(profileId));
      },
    };
  }
  ```

- [ ] **Step 4: Commit** (`feat: wdio E2E harness + per-test fixture (E.4)`).

---

### Task 9: First end-to-end scenario — Plan-07 merge flow

**Files:**

- Create: `tests/src/e2e-tauri/merge-pr.spec.ts`

The scenario:

```ts
import { startRecrestE2E } from "../fixtures/recrest";

describe("Plan 07 — Provider-side merge", () => {
  it("merges a GitHub PR with squash + branch delete, row flips to merged", async () => {
    const { page, mocks, cleanup } = await startRecrestE2E();
    try {
      await page.openRepo("test-repo-github");
      await page.openMr({ repoId: "test-repo-github", prNumber: 1 });
      await page.openMergeModal();
      await page.pickStrategy("squash");
      await page.toggleDeleteSourceBranch(true);
      await page.confirmMerge();

      // assert UI state
      await page.expectToast(/merged/i);
      await page.expectToast(/branch.*deleted/i);
      await page.expectRowState(1, "merged");

      // assert mock-server saw the right calls
      expect(mocks.github.requests.put).toContainEqual(
        expect.objectContaining({
          path: "/repos/test-org/test-repo-github/pulls/1/merge",
          body: expect.objectContaining({ merge_method: "squash" }),
        }),
      );
      expect(mocks.github.requests.delete).toContainEqual(
        expect.objectContaining({
          path: "/repos/test-org/test-repo-github/git/refs/heads/feature-x",
        }),
      );
    } finally {
      await cleanup();
    }
  });

  it("disables rebase for Bitbucket repos", async () => { ... });
  it("times out gracefully when GitLab rebase stalls", async () => { ... }); // applies gitlab_rebase_stuck scenario
  it("reports source_branch_deleted=false on protected branch", async () => { ... });
  // …
});
```

- [ ] **Step 1: Spec** for the GitHub happy path. Should exercise everything Plan 07's done-check item 3 calls for (live Playwright-MCP check) — but unattended.

- [ ] **Step 2: 4-5 additional specs** covering: BB-rebase-disabled, GL-protected-branch, GL-rebase-timeout, GH-conflict-handling, local-fallback-when-no-providerId.

- [ ] **Step 3: Run** `docker run --rm -v $PWD:/workspace recrest-e2e bash -c 'yarn test:e2e:tauri'` → all green.

- [ ] **Step 4: Commit** (`test: E2E coverage for Plan 07 merge flow (E.4)`).

---

## E.5 — Top-level wiring + CI

### Task 10: `yarn test:e2e:tauri` script + Makefile target

**Files:**

- Modify: `package.json` (root) — add `"test:e2e:tauri": "tests/scripts/run-tauri-e2e.sh"`
- Create: `tests/scripts/run-tauri-e2e.sh` (wraps `docker build` + `docker run` + result-pipe)
- Modify: `Makefile` (if exists) — `e2e-tauri` target

- [ ] **Step 1:** The script builds the image if missing, mounts the repo, sets `RECREST_E2E_LOG_LEVEL`, and runs wdio with a spec filter passed through.

- [ ] **Step 2: Output piping** — wdio's spec reporter to stdout; mock-server logs to `target/e2e-logs/mock-*.log`; failures dump the full mock-request-log + the Tauri stderr to `target/e2e-logs/run-<timestamp>/`.

- [ ] **Step 3:** Commit (`feat: yarn test:e2e:tauri script (E.5)`).

---

### Task 11: CI integration (GitHub Actions)

**Files:**

- Create: `.github/workflows/e2e-tauri.yml`

- [ ] **Step 1:** Workflow runs on PRs that touch `app/`, `shared/`, or `tests/`. Uses GitHub-hosted Ubuntu runner directly (no Docker layer needed in CI — Linux native). Caches the Cargo registry + target dir aggressively.

- [ ] **Step 2:** Upload `target/e2e-logs/` as a workflow artifact on failure.

- [ ] **Step 3:** Budget: each spec under 30s, full suite under 5 min. If we hit the ceiling, parallelize specs across capabilities (wdio's `maxInstances` doesn't help with tauri-driver single-session, but we can shard across multiple jobs).

- [ ] **Step 4:** Commit (`ci: Tauri E2E workflow (E.5)`).

---

## E.6 — Backfill previous plans

### Task 12: Use the harness to close the deferred Done-check items

**Files:**

- Create: `tests/src/e2e-tauri/git-config.spec.ts` (closes Plan 06 deferred E2E)
- Create: `tests/src/e2e-tauri/repo-management.spec.ts` (covers Plans 02 + 03)
- Create: `tests/src/e2e-tauri/provider-depth.spec.ts` (covers Plans 04 + 05)

- [ ] **Step 1:** Plan-06 deferred: open Settings → Git config → add identity (`gitdir:/tmp/scratch/`) → assert `.gitconfig` mutation (verify via reading the file from the test profile's filesystem) → remove identity → assert block gone.

- [ ] **Step 2:** Walk Plan-02 done-check items as specs (pin/unpin direct-click, sortable header, import defaults).

- [ ] **Step 3:** Walk Plan-03 done-check items (stage/unstage/discard/stash, commit with hook-aware path, git config view/edit).

- [ ] **Step 4:** Once each plan's deferred items are covered, flip its README status footnote to ✅ Done (no more `¹` superscript).

- [ ] **Step 5:** Commit per plan as items land (`test: backfill E2E for Plan 06 (E.6)`, etc.).

---

## Done-check (Phase E.1–E.6)

- [ ] `yarn test:e2e:tauri` boots a fresh Tauri Linux build inside Docker, drives the UI through tauri-driver, talks to mock providers, and exits green in under 5 min.
- [ ] The harness leaves zero state on the host: no entries in `~/Library/Application Support/`, no keychain mutations, no git config touched. Verified by snapshotting the user's home before/after a run.
- [ ] Every Rust `CommandError::bad_request` branch in `providers/{github,gitlab,bitbucket}.rs` has a corresponding mock scenario + a spec that triggers it.
- [ ] Plans 02, 03, 04, 05, 06, 07 each have at least one E2E spec exercising the highest-value end-to-end flow they introduced. The "deferred — final E2E sweep" footnotes in README and Plan-06's Done-check are removed.
- [ ] CI workflow runs on PRs and blocks merge on failure.
- [ ] First-time onboarding: a new contributor runs `yarn test:e2e:tauri` and it works without manual setup beyond Docker being installed.

---

## Out of scope (deferred, named explicitly)

- **macOS-specific behavior** — Apple-grid icons, NSDistributedNotificationCenter polling, tray-template-on-macOS, native menubar, WKWebView appearance quirks. These are not exercised by the Linux container. Keep manual-smoke-on-macOS for these. The harness covers everything else.
- **Real provider integration tests** (against real api.github.com etc.). Pure mock-server coverage. If we ever want a "production-smoke" suite, that's a separate plan and needs throwaway accounts + secrets management.
- **Visual regression** (pixel diffs). Out of scope here; if added later, fits into the same `wdio` runner.
- **Performance / load testing.** Out of scope. Tauri-driver is single-session by design.
- **OAuth flows.** Mock servers don't simulate the browser-side authorization step. PAT-only auth in tests (Recrest's MVP default anyway).
- **Code-signing / installer behavior.** Linux build skips bundle generation; installers stay in the manual release-smoke bucket.

---

## Risks & open questions

- **Tauri-driver maturity on Linux:** the WebDriver implementation is functional but historically lags Tauri-core releases. Lock the `tauri-driver` version in the Dockerfile and pin upgrades.
- **wdio's "tauri:options" capability is a newer addition.** If we hit issues, the fallback is a plain `webkit2gtk-webdriver` capability with a custom `before` hook that launches the Tauri binary as a child process and points wdio at its WebKit debug port.
- **Cold Docker build time (~10-15 min).** Mitigated by aggressive caching, but first-time contributor experience is rough. Document in `tests/docker/README.md`.
- **Linux vs macOS divergence in the UI layer.** webkit2gtk and WKWebView are both WebKit but version-drift can be 6+ months. CSS bugs that show up only on WKWebView won't be caught here. Mitigation: keep the existing Playwright `yarn dev:web` suite which runs in Chromium and catches the same class of bugs from a different angle; together they cover most rendering regressions.
- **`tauri-driver` doesn't support multi-window.** If a future feature opens a second window, we'll need a different harness for that. Out of scope for now.
