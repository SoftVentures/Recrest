import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { injectTokens, profileRoot } from "../../helpers/tokenInjection";
import { MockProviderSuite } from "../../mocks/providers";
import { type ScenarioName, applyScenario } from "../../mocks/providers/scenarios";
import { RecrestPage } from "../page/recrestPage";

declare const browser: WebdriverIO.Browser;

/// Plan-8 wdio fixture.
///
/// **Session model**: tauri-driver spawns the Tauri binary ONCE per wdio
/// session. Env-vars set inside a spec do NOT reach an already-running
/// binary, so the harness uses one fixed `RECREST_TEST_PROFILE` for the
/// whole run (wired by `wdio.conf.ts::onPrepare`). Per-spec isolation
/// comes from:
///   1. `MockProviderSuite.reset()` between specs (in-memory state wipe)
///   2. Rewriting `settings.json` and asking the backend to reload via
///      `scan_repos` / `read_settings` thunks (handled by spec setup)
///   3. `browser.reloadSession()` for specs that need a fully-fresh
///      backend (slower; opt in via `restartBinary: true`)
///
/// Usage:
/// ```ts
/// const { page, mocks, cleanup } = await startRecrestE2E();
/// try {
///   await page.openMergeModal();
///   ...
/// } finally {
///   await cleanup();
/// }
/// ```
export interface StartedE2E {
  page: RecrestPage;
  mocks: MockProviderSuite;
  profileId: string;
  /// Force the Tauri binary to relaunch through a fresh WebDriver
  /// session. Call this after writing settings.json (or any other
  /// once-at-boot state) so the new state actually takes effect. Throws
  /// if the WebDriver API doesn't expose `reloadSession()` instead of
  /// silently running against the stale binary.
  restart: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export interface StartOptions {
  /// Apply a named failure-mode scenario after the mocks start. See
  /// `tests/src/mocks/providers/scenarios.ts` for the catalog.
  scenario?: ScenarioName;
  /// Override per-provider tokens. Defaults to `"e2e-${provider}"`.
  tokens?: Partial<Record<"github" | "gitlab" | "bitbucket", string>>;
  /// Force a fresh Tauri binary launch by reloading the WebDriver session
  /// before this spec runs. Slow (~5s) — only use when the spec genuinely
  /// needs a cold-start backend (env-var re-read, watcher reset, etc.).
  restartBinary?: boolean;
}

/// Singleton mocks suite shared across all specs in the wdio run.
/// `start()` runs once via `wdio.conf.ts::onPrepare`; specs call
/// `reset()` via this fixture's `cleanup()`.
let sharedMocks: MockProviderSuite | null = null;

export async function ensureMocksStarted(): Promise<MockProviderSuite> {
  if (sharedMocks) return sharedMocks;
  sharedMocks = new MockProviderSuite();
  const urls = await sharedMocks.start();
  process.env.RECREST_PROVIDER_BASE_URLS = [
    `github=${urls.githubUrl}`,
    `gitlab=${urls.gitlabUrl}`,
    `bitbucket=${urls.bitbucketUrl}`,
  ].join(",");
  return sharedMocks;
}

export async function stopMocks(): Promise<void> {
  if (!sharedMocks) return;
  await sharedMocks.stop();
  sharedMocks = null;
  delete process.env.RECREST_PROVIDER_BASE_URLS;
}

export async function startRecrestE2E(opts: StartOptions = {}): Promise<StartedE2E> {
  const mocks = await ensureMocksStarted();
  mocks.reset();
  if (opts.scenario) applyScenario(mocks, opts.scenario);

  const profileId = process.env.RECREST_TEST_PROFILE ?? "shared";

  await injectTokens(profileId, {
    github: opts.tokens?.github ?? "e2e-github",
    gitlab: opts.tokens?.gitlab ?? "e2e-gitlab",
    bitbucket: opts.tokens?.bitbucket ?? "e2e-bitbucket",
  });

  const restart = async (): Promise<void> => {
    if (typeof browser?.reloadSession !== "function") {
      throw new Error(
        "StartedE2E.restart() requires browser.reloadSession() — " +
          "the wdio API surface has shifted. Pin @wdio/* or update this fixture.",
      );
    }
    await browser.reloadSession();
  };

  if (opts.restartBinary) await restart();

  const page = new RecrestPage(browser);

  let cleaned = false;
  const cleanup = async (): Promise<void> => {
    if (cleaned) return;
    cleaned = true;
    mocks.reset();
  };

  return { page, mocks, profileId, restart, cleanup };
}

/// Write seed `settings.json` directly into the shared test profile.
/// Call this BEFORE the first navigation in your spec so the backend
/// picks up the repos when the user clicks the Repos tab (which triggers
/// the `read_settings` thunk on every mount).
///
/// **Real-data isolation guard.** Refuses to write any repo whose `path`
/// points outside `$TMPDIR/` or the test profile. This is the last line
/// of defense in case a spec accidentally seeds with a real path on the
/// user's machine — better to fail loudly than silently expose the user's
/// repos to the Tauri watcher.
export async function seedSettings(
  profileId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  assertNoRealRepoPaths(settings);
  const dir = profileRoot(profileId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "settings.json"), JSON.stringify(settings, null, 2));
}

function assertNoRealRepoPaths(settings: Record<string, unknown>): void {
  const repos = (settings.repos ?? {}) as Record<string, { path?: unknown }>;
  const tmpRoot = path.resolve(tmpdir());
  for (const [repoId, repo] of Object.entries(repos)) {
    const p = typeof repo?.path === "string" ? repo.path : undefined;
    if (!p) continue;
    const resolved = path.resolve(p);
    const isSafe = resolved.startsWith(tmpRoot) || resolved.startsWith("/private/tmp");
    if (!isSafe) {
      throw new Error(
        `[seedSettings] refusing to seed repo "${repoId}" with non-tmp path "${p}". ` +
          `Real-data isolation: every seeded repo must live under $TMPDIR (got tmpRoot=${tmpRoot}, resolved=${resolved}). ` +
          `If this is intentional, the harness needs a new opt-in flag.`,
      );
    }
  }
}
