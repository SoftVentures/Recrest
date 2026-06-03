import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/// One profile id for the whole wdio run. Set BEFORE tauri-driver
/// launches the Tauri binary so the env-var inheritance works (C2/C3 fix
/// from the Plan-8 code review). Per-spec isolation comes from
/// `MockProviderSuite.reset()` + `settings.json` rewrites between specs.
const SHARED_PROFILE_ID = `wdio-${Date.now()}-${randomBytes(3).toString("hex")}`;
const PROFILE_ROOT = path.join(tmpdir(), `recrest-test-${SHARED_PROFILE_ID}`);

/// Plan-8 "real-data isolation" guarantee.
///
/// `RECREST_TEST_PROFILE` covers every callsite that goes through
/// `crate::identity::test_profile_root()`, but the Rust code base also
/// has paths that hit the user's filesystem *directly*:
///   - `dirs::home_dir()` / `dirs::data_dir()` / `dirs::config_dir()`
///     (`auth/token.rs:259`, `commands/git_config.rs:317/325/1074`,
///     `commands/ssh.rs:32`, `commands/ide.rs:42/52/62`,
///     `commands/repos.rs:639`)
///   - `git2::Config::open_default()` reads `~/.gitconfig` and
///     `/etc/gitconfig` (`commands/git_config.rs:28`,
///     `commands/git_ops.rs:164`)
///
/// To make these *all* land in the sandbox, override the env-vars the
/// `dirs` crate and `libgit2` consult, BEFORE the Tauri binary launches.
/// Effect: the harness can't touch the user's real `~/.gitconfig`,
/// `~/.local/share/`, `~/.config/`, SSH keys, or any home-rooted path.
mkdirSync(PROFILE_ROOT, { recursive: true });
mkdirSync(path.join(PROFILE_ROOT, ".config"), { recursive: true });
mkdirSync(path.join(PROFILE_ROOT, ".local", "share"), { recursive: true });
mkdirSync(path.join(PROFILE_ROOT, ".cache"), { recursive: true });
// Empty global gitconfig — libgit2 reads this instead of $HOME/.gitconfig
// when GIT_CONFIG_GLOBAL is set. Empty file = no inherited identity.
writeFileSync(path.join(PROFILE_ROOT, ".gitconfig"), "");

process.env.RECREST_TEST_PROFILE = SHARED_PROFILE_ID;
process.env.HOME = PROFILE_ROOT;
process.env.XDG_CONFIG_HOME = path.join(PROFILE_ROOT, ".config");
process.env.XDG_DATA_HOME = path.join(PROFILE_ROOT, ".local", "share");
process.env.XDG_CACHE_HOME = path.join(PROFILE_ROOT, ".cache");
process.env.GIT_CONFIG_GLOBAL = path.join(PROFILE_ROOT, ".gitconfig");
process.env.GIT_CONFIG_SYSTEM = "/dev/null";

console.log(`[wdio] sandbox profile = ${PROFILE_ROOT}`);

/// Path to the Tauri binary the harness launches. Resolved at config-load
/// time so a missing build fails fast, before any spec runs. The Docker
/// entrypoint exports `RECREST_E2E_TAURI_BIN` — when invoked through the
/// entrypoint, the fallback below is never used. For direct wdio runs
/// (Linux dev shells), the fallback derives the cargo target triple
/// from Node's view of the host arch; passing `RECREST_E2E_TAURI_BIN`
/// is still the recommended path because Cargo bin names occasionally
/// drift (Recrest vs recrest vs recrest-e2e).
const NODE_ARCH_TO_RUST_TARGET: Record<string, string> = {
  x64: "x86_64-unknown-linux-gnu",
  arm64: "aarch64-unknown-linux-gnu",
};
const FALLBACK_RUST_TARGET =
  NODE_ARCH_TO_RUST_TARGET[process.arch] ?? "x86_64-unknown-linux-gnu";
const TAURI_BIN =
  process.env.RECREST_E2E_TAURI_BIN ??
  path.resolve(
    __dirname,
    "..",
    "app",
    "src-tauri",
    "target",
    FALLBACK_RUST_TARGET,
    "debug",
    "Recrest",
  );

/// Loosely-typed config — `@wdio/types` keeps reshuffling between minor
/// versions, and we don't want to redo this on every wdio bump. The
/// runner validates against its own schema at load time anyway.
export const config = {
  runner: "local" as const,
  specs: ["./src/e2e-tauri/**/*.spec.ts"],
  exclude: [] as string[],

  // tauri-driver is single-session — running multiple specs concurrently
  // would fight over the WebDriver lock. Shard at the CI-job level if we
  // ever outgrow this.
  maxInstances: 1,

  capabilities: [
    {
      // The `tauri:options` cap is the only cap `tauri-driver` 0.1.x
      // requires. The canonical Tauri docs example uses exactly this
      // shape — adding `browserName` or `wdio:enforceWebDriverClassic`
      // makes tauri-driver reject the session ("Failed to match
      // capabilities"). WDIO v9 will still negotiate the W3C session
      // against tauri-driver's HTTP intermediary without a browserName.
      "tauri:options": {
        application: TAURI_BIN,
      },
    },
  ],

  logLevel: "info" as const,
  bail: 0,

  hostname: "localhost",
  port: 4444,
  path: "/",

  waitforTimeout: 15_000,
  // Bumped from 30s — under amd64-on-aarch64 QEMU emulation, the Tauri
  // binary's cold-start (init plugins, libwebkit2gtk, etc.) regularly
  // exceeds 30s on the first launch. 120s gives headroom without making
  // genuine failures hang the suite.
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60_000,
  },

  /// onPrepare runs ONCE per wdio invocation, before any tauri-driver
  /// session is created. We start the mock provider suite here so its
  /// URLs land in `RECREST_PROVIDER_BASE_URLS` before the Tauri binary's
  /// first launch.
  onPrepare: async () => {
    const { ensureMocksStarted } = await import("./src/e2e-tauri/fixtures/recrest");
    await ensureMocksStarted();
  },

  onComplete: async () => {
    const { stopMocks } = await import("./src/e2e-tauri/fixtures/recrest");
    await stopMocks();
  },
};
