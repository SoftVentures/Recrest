import type { AppSeed } from "./seed/index.js";

/**
 * Build an init-script that installs a fake `window.__TAURI_INTERNALS__`
 * **before** the page executes anything. The result is a self-contained JS
 * string — inject it via `page.addInitScript({ content: buildTauriStub(seed) })`.
 *
 * The stub routes calls by command name:
 *  - App commands (see `app/src-tauri/src/lib.rs::generate_handler![...]`) map
 *    onto the seed.
 *  - `plugin:event|listen`/`unlisten` return a numeric id + no-op, so
 *    subscriptions cost nothing.
 *  - `plugin:window|*` returns reasonable defaults so the titlebar renders
 *    without crashing.
 *  - Anything else resolves to `null` (matches `safeInvoke`'s contract).
 *
 * When extending: add a case to `handleCommand()`; unknown commands intentionally
 * resolve rather than reject so a missing branch shows up as empty UI instead
 * of a test crash.
 */
export function buildTauriStub(seed: Required<AppSeed>): string {
  const serialised = JSON.stringify(seed).replace(/</g, "\\u003c");
  return `
(() => {
  const SEED = ${serialised};
  const callbacks = new Map();
  // Channel name -> set of callback ids, so emit() delivers a payload only to
  // listeners of that event (mirrors the dev:web stub's eventListeners map).
  const eventListeners = new Map();
  let nextId = 1;

  function transformCallback(callback, once = false) {
    const id = nextId++;
    callbacks.set(id, (arg) => {
      if (once) callbacks.delete(id);
      try { callback?.(arg); } catch (err) { console.warn("[tauri-stub] callback err:", err); }
    });
    return id;
  }

  function registerEventListener(event, handler) {
    const id = transformCallback(handler);
    let set = eventListeners.get(event);
    if (!set) { set = new Set(); eventListeners.set(event, set); }
    set.add(id);
    return id;
  }

  function removeListener(id) {
    callbacks.delete(id);
    for (const set of eventListeners.values()) set.delete(id);
  }

  // Shape the argument like \`@tauri-apps/api/event\` (\`{ event, id, payload }\`)
  // so handlers read \`e.payload\` exactly as against the real runtime.
  function emit(event, payload) {
    const set = eventListeners.get(event);
    if (!set) return;
    for (const id of set) {
      const cb = callbacks.get(id);
      if (cb) cb({ event, id, payload });
    }
  }

  function resolveCommitsInRange(args) {
    const sinceMs = args && args.since ? Date.parse(args.since) : -Infinity;
    const untilMs = args && args.until ? Date.parse(args.until) : Infinity;
    const cap = args && args.maxCommitsPerRepo;
    const buckets = SEED.recentCommits || {};
    const out = [];
    for (const repoId of Object.keys(buckets)) {
      const inRange = (buckets[repoId] || []).filter((c) => {
        const ts = Date.parse(c.timestamp);
        return ts >= sinceMs && ts <= untilMs;
      });
      const commits = typeof cap === "number" ? inRange.slice(0, cap) : inRange;
      if (commits.length > 0) out.push({ repoId, commits });
    }
    return out;
  }

  function resolveOldestCommitDate() {
    const buckets = SEED.recentCommits || {};
    let oldest = null;
    for (const repoId of Object.keys(buckets)) {
      for (const c of buckets[repoId] || []) {
        const ts = Date.parse(c.timestamp);
        if (!Number.isNaN(ts) && (oldest === null || ts < oldest)) oldest = ts;
      }
    }
    return oldest === null ? null : new Date(oldest).toISOString();
  }

  function resolveRecentCommits(args) {
    const repoId = args && args.repoId;
    const buckets = SEED.recentCommits || {};
    if (repoId) {
      return buckets[repoId] || [];
    }
    // No repoId: aggregate across all repos (the Rust backend returns the
    // full recent-commit feed when called without a filter).
    const all = [];
    for (const id of Object.keys(buckets)) {
      for (const c of buckets[id] || []) all.push(c);
    }
    // Newest-first, like the real backend.
    all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return all;
  }

  function resolvePrEvents(args) {
    const days = (args && args.days) || 14;
    const cutoffMs = Date.now() - days * 86_400_000;
    const out = [];
    const prsByRepo = SEED.prs || {};
    // The frontend fans out list_pr_events per repo, so this handler must
    // filter to args.repoId. Returning events for every repo on every call
    // duplicates rows N times in the merged feed.
    const filterRepoId = args && args.repoId;
    for (const [repoId, prs] of Object.entries(prsByRepo)) {
      if (filterRepoId && repoId !== filterRepoId) continue;
      const repo = SEED.repos.find((r) => r.id === repoId);
      if (!repo) continue;
      for (const pr of prs) {
        const createdMs = new Date(pr.createdAt).getTime();
        if (createdMs >= cutoffMs) {
          out.push({
            repoId,
            repoName: repo.name,
            number: pr.number,
            title: pr.title,
            author: pr.author,
            url: pr.url,
            timestamp: pr.createdAt,
            kind: "opened",
          });
        }
        // Infer a merge timestamp for merged/closed PRs: fall back to
        // updatedAt because the base PullRequest DTO does not carry an
        // explicit mergedAt.
        if ((pr.state === "merged" || pr.state === "closed") && pr.updatedAt) {
          const mergedMs = new Date(pr.updatedAt).getTime();
          if (mergedMs >= cutoffMs) {
            out.push({
              repoId,
              repoName: repo.name,
              number: pr.number,
              title: pr.title,
              author: pr.author,
              url: pr.url,
              timestamp: pr.updatedAt,
              kind: pr.state === "merged" ? "merged" : "closed",
            });
          }
        }
      }
    }
    // Synthesize a handful of extra merged PRs spread across the window so the
    // velocity chart / TTM histogram have something to chew on beyond the
    // single merged PR in the seed. Only emitted for the repo the caller
    // asked about (or for every repo when the caller didn't filter).
    const nowMs = Date.now();
    for (let d = 1; d < days; d++) {
      if (d % 2 === 0) continue;
      const ts = new Date(nowMs - d * 86_400_000 - 3_600_000 * (d % 5)).toISOString();
      const repoIdx = d % SEED.repos.length;
      const repo = SEED.repos[repoIdx];
      if (!repo) continue;
      if (filterRepoId && repo.id !== filterRepoId) continue;
      const num = 900 + d;
      const title = "chore: weekly cleanup " + d;
      const url = (repo.remoteUrl || "https://example.com") + "/pull/" + num;
      out.push({
        repoId: repo.id,
        repoName: repo.name,
        number: num,
        title,
        author: "sasha",
        url,
        timestamp: new Date(nowMs - (d + 1) * 86_400_000).toISOString(),
        kind: "opened",
      });
      out.push({
        repoId: repo.id,
        repoName: repo.name,
        number: num,
        title,
        author: "sasha",
        url,
        timestamp: ts,
        kind: "merged",
      });
    }
    return out;
  }

  function resolveCheckRuns(args) {
    // Respect the per-repo call contract — the frontend fans out per repo,
    // so this handler must return summaries for just args.repoId. Returning
    // the full dataset every time dupes rows N times in the timeline.
    const repoId = args && args.repoId;
    const repo = repoId ? SEED.repos.find((r) => r.id === repoId) : null;
    if (!repo) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out = [];
    // 14 days of history, varied per repo via a tiny PRNG on repo id.
    let h = 0;
    for (let i = 0; i < repo.id.length; i++) h = (h * 31 + repo.id.charCodeAt(i)) >>> 0;
    for (let d = 0; d < 14; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - d);
      const dayStr = day.toISOString().slice(0, 10);
      // Vary totals: 2–7 runs per day, 0–3 failing based on a cheap hash.
      const seedA = ((h ^ (d * 2654435761)) >>> 0) % 100;
      if (seedA < 15) continue; // some days without check runs at all
      const total = 2 + (seedA % 6);
      const failed = seedA < 30 ? (seedA % 3) : 0;
      const passed = Math.max(0, total - failed);
      out.push({
        repoId: repo.id,
        repoName: repo.name,
        day: dayStr,
        commitSha: repo.status.head || "00000000",
        total,
        passed,
        failed,
        neutral: 0,
        pending: 0,
      });
    }
    return out;
  }

  function resolveStatus(repoId) {
    const repo = SEED.repos.find((r) => r.id === repoId);
    return repo ? repo.status : null;
  }

  async function handleCommand(cmd, args) {
    switch (cmd) {
      // --- repos
      case "scan_repos":
      case "list_repos":
        return SEED.repos;
      case "repo_status":
        return SEED.repos.find((r) => r.id === args?.repoId) || null;
      case "add_repo": {
        const repo = {
          id: "repo-" + Math.random().toString(36).slice(2, 10),
          name: (args?.path || "").split(/[\\\\/]/).filter(Boolean).pop() || "repo",
          path: args?.path || "",
          groupId: args?.groupId ?? null,
          remoteUrl: null,
          providerId: null,
          logoPath: null,
          logoDarkPath: null,
          sshKeyPath: null,
          status: SEED.repos[0]?.status ?? null,
        };
        return repo;
      }
      case "remove_repo":
        return undefined;
      case "forget_repos_under_path": {
        // Mirror the Rust prune: drop seed repos under the removed root that
        // no remaining root still covers, return their ids, and shrink SEED so
        // a follow-up list_repos reflects the prune.
        const norm = (p) => String(p).replace(/\\\\/g, "/").replace(/[/]+$/, "");
        const under = (child, root) => {
          if (!root) return false;
          const c = norm(child);
          const r = norm(root);
          return c === r || c.startsWith(r + "/");
        };
        const removed = (args && args.removedPath) || "";
        const remaining = (args && args.remainingPaths) || [];
        const ids = SEED.repos
          .filter((r) => under(r.path, removed) && !remaining.some((rem) => under(r.path, rem)))
          .map((r) => r.id);
        SEED.repos = SEED.repos.filter((r) => !ids.includes(r.id));
        return ids;
      }
      // --- drift parity: commands registered in lib.rs that the stub had not
      // grown a branch for yet. Minimal returns mirroring devStub.ts so the
      // app's thunks resolve with a usable shape instead of null. Kept here in
      // one block so the rust-command-drift spec stays green as lib.rs grows.
      case "delete_repo":
        return undefined;
      case "set_repo_logo": {
        const i = SEED.repos.findIndex((r) => r.id === (args && args.repoId));
        if (i >= 0)
          SEED.repos[i] = { ...SEED.repos[i], logoPath: "stub://logo/" + SEED.repos[i].id, logoIsCustom: true };
        return SEED.repos[i] || null;
      }
      case "clear_repo_logo": {
        const i = SEED.repos.findIndex((r) => r.id === (args && args.repoId));
        if (i >= 0) SEED.repos[i] = { ...SEED.repos[i], logoPath: null, logoIsCustom: false };
        return SEED.repos[i] || null;
      }
      case "ssh_unlock_key":
        return undefined;
      case "set_repo_ssh_key": {
        const i = SEED.repos.findIndex((r) => r.id === (args && args.repoId));
        if (i >= 0) SEED.repos[i] = { ...SEED.repos[i], sshKeyPath: (args && args.keyPath) ?? null };
        return undefined;
      }
      case "list_ssh_keys":
        return {
          dir: "/Users/dev/.ssh",
          keys: [{ path: "/Users/dev/.ssh/id_ed25519", name: "id_ed25519", hasPublic: true }],
        };
      case "git_branch_delete":
      case "git_stage":
      case "git_unstage":
      case "git_stash":
      case "git_stash_pop":
      case "git_stash_drop":
      case "git_commit":
        return resolveStatus(args?.repoId);
      case "git_discard":
        return {
          discarded: (args && args.paths) || [],
          requiresConfirmation: [],
          status: resolveStatus(args?.repoId),
        };
      case "git_stash_list":
        return [];
      case "git_has_pre_commit_hook":
        return false;
      case "get_git_config":
      case "set_git_config":
        return { scope: args && args.repoId == null ? "global" : "repo", entries: {} };
      // Layered git-config (RepoGitConfigCard + GitConfigTab). Empty layers /
      // origins are a valid "nothing configured yet" shape; the include
      // add/remove commands are fire-and-forget.
      case "list_git_config_layers":
        return [];
      case "get_git_config_with_origins":
      case "set_git_config_in_layer":
        return {};
      case "add_git_config_include":
      case "remove_git_config_include":
        return undefined;
      case "get_pr_diff":
        // loadPrDiff resolves this value AS the FileDiff[] diff array directly.
        // Returning the Rust PrDiff wrapper object made the diff a non-array,
        // which threw "diff is not iterable" in the MR detail panel.
        return [];
      case "post_pr_comment":
        return undefined;
      case "list_workflows":
      case "list_workflow_runs":
        return [];
      case "trigger_workflow":
      case "cancel_workflow_run":
        return undefined;
      case "get_pages_status":
        return null;
      case "factory_reset":
        return undefined;
      case "set_caption_button_bounds":
        return undefined;
      case "list_recent_commits":
        return resolveRecentCommits(args);
      case "list_commits": {
        // Range query: filter the recent-commit feed to since<=ts<=until and
        // stream one chunk per repo over activity://commits-chunk (the only
        // path the frontend reads commit data through). Chunks MUST fire
        // before the summary resolves: the real backend emits while the
        // command is still running, and the activity reducer drops chunks
        // whose requestId no longer matches the in-flight request.
        const requestId = (args && args.requestId) || "";
        const grouped = resolveCommitsInRange(args);
        const totals = {};
        const truncated = {};
        for (const g of grouped) { totals[g.repoId] = g.commits.length; truncated[g.repoId] = false; }
        for (const g of grouped) {
          emit("activity://commits-chunk", {
            requestId, repoId: g.repoId, commits: g.commits, done: true, truncated: false,
          });
        }
        return { requestId, totals, truncated };
      }
      case "get_oldest_commit_date":
        return resolveOldestCommitDate();
      case "list_pr_events":
        return resolvePrEvents(args);
      case "list_check_runs":
        return resolveCheckRuns(args);
      case "detect_ides":
        return ["vscode"];
      // OS probes degrade to the renderer's stub maps on an empty result, so
      // [] is the correct no-detection signal outside a real OS scan.
      case "detect_terminals":
      case "detect_shells":
        return [];
      case "load_logo_bytes":
        return null;
      case "open_in_ide":
      case "open_terminal":
      case "open_in_explorer":
        return undefined;

      // --- git ops (return the repo's current status as a no-op)
      case "git_fetch":
      case "git_pull":
      case "git_push":
      case "git_checkout":
      case "git_checkout_remote":
      case "git_branch_create":
        return resolveStatus(args?.repoId);
      case "git_fetch_all":
        return SEED.repos.length;
      case "git_list_branches":
        return [
          { name: "main", isRemote: false, isHead: true, upstream: "origin/main", ahead: 0, behind: 0 },
          { name: "develop", isRemote: false, isHead: false, upstream: "origin/develop", ahead: 0, behind: 1 },
        ];
      case "git_merge":
        return { status: resolveStatus(args?.repoId), conflicts: [] };
      case "git_clone":
        return SEED.repos[0] ?? null;

      // --- search
      case "find_across_repos": {
        const q = String(args?.query ?? "").trim();
        const repoId = args?.repoId;
        const repo = SEED.repos[0];
        if (q.length < 2 || !repo) return [];
        if (repoId && repoId !== repo.id) return [];
        return [
          {
            repoId: repo.id,
            repoName: repo.name,
            path: "src/index.ts",
            absolutePath: repo.path + "/src/index.ts",
            line: 10,
            column: 3,
            snippet: 'import { ' + q + ' } from "./lib";',
          },
          {
            repoId: repo.id,
            repoName: repo.name,
            path: "README.md",
            absolutePath: repo.path + "/README.md",
            line: 1,
            column: 1,
            snippet: "# " + q,
          },
        ];
      }
      case "open_file_in_ide":
        return undefined;

      // --- remote import
      case "list_remote_repositories":
        return [];
      case "list_remote_organizations":
        return [];
      case "clone_remote_repository":
        return SEED.repos[0] ?? null;
      case "clone_remote_repositories_bulk":
        return [];
      case "create_and_open_workspace":
        return undefined;

      // --- providers
      case "list_providers":
        return Object.values(SEED.providers || {});
      case "set_provider_token": {
        // The real command verifies the token and returns the refreshed
        // ProviderConnection (connected=true). setProviderToken.fulfilled
        // writes action.payload straight into state.connections, so returning
        // undefined would corrupt the slice. Mutate SEED so a follow-up
        // list_providers (ProviderRow re-fetches after save) stays consistent.
        const id = args && args.providerId;
        const prev = (SEED.providers && SEED.providers[id]) || {
          providerId: id,
          displayName: id,
          supportsOauth: false,
          baseUrl: null,
        };
        const next = {
          ...prev,
          providerId: id,
          connected: true,
          username: (args && args.username) || prev.username || (id + "-user"),
        };
        if (!SEED.providers) SEED.providers = {};
        SEED.providers[id] = next;
        return next;
      }
      case "set_provider_base_url": {
        const id = args && args.providerId;
        const prev = (SEED.providers && SEED.providers[id]) || {
          providerId: id,
          displayName: id,
          connected: false,
          username: null,
          supportsOauth: false,
        };
        const next = { ...prev, providerId: id, baseUrl: (args && args.baseUrl) ?? null };
        if (!SEED.providers) SEED.providers = {};
        SEED.providers[id] = next;
        return next;
      }
      case "clear_provider_token":
        return undefined;
      case "fetch_pull_requests":
        return (SEED.prs && SEED.prs[args?.repoId]) || [];
      case "get_pr_detail": {
        const list = (SEED.prs && SEED.prs[args?.repoId]) || [];
        const base = list.find((pr) => pr.number === args?.prNumber);
        if (!base) return null;
        return { ...base, body: "", mergeable: true, reviewers: [], files: [], timeline: [] };
      }
      case "merge_pull_request": {
        // The frontend optimistically flips the row's state after this resolves;
        // mirror the dev:web stub's MergeResult shape.
        const input = (args && args.input) || {};
        return {
          merged: true,
          mergeSha: "stubmerge" + ((args && args.prNumber) ?? "0"),
          sourceBranchDeleted: !!input.deleteSourceBranch,
          message: "stub merge (" + (input.strategy || "merge") + ")",
        };
      }

      // --- custom fonts (Tauri-only filesystem upload; empty under the stub)
      case "list_custom_fonts":
        return [];
      case "upload_font":
      case "delete_custom_font":
        return undefined;

      // --- notifications / oauth / settings / window / system
      case "notify":
        return undefined;
      case "begin_oauth":
        return { authorizationUrl: "about:blank", state: "stub" };
      case "complete_oauth":
        return undefined;
      case "get_settings": {
        // Read a localStorage overlay (written by update_settings below) so a
        // page reload re-hydrates the user's last settings — mirroring real
        // Tauri's settings.json persistence and devStub.ts. Without this the
        // stub re-seeds on every navigation and persistence can't be tested.
        try {
          const overlay = window.localStorage.getItem("__RECREST_TEST_SETTINGS__");
          if (overlay) SEED.settings = { ...SEED.settings, ...JSON.parse(overlay) };
        } catch (e) { void e; }
        return SEED.settings;
      }
      case "update_settings": {
        // The real command returns the patched AppSettings. Returning undefined
        // made every saveSettings.fulfilled consumer choke (e.g.
        // reposReducer does state.scanPaths = action.payload.scanPaths), which
        // silently broke sidebar-collapse, theme persistence and scan-path
        // edits under the stub. Mirror prod: apply the patch, persist a
        // localStorage overlay (for reload), and return the merged settings.
        const patch = (args && args.patch) || {};
        SEED.settings = { ...SEED.settings, ...patch };
        try {
          const prev = window.localStorage.getItem("__RECREST_TEST_SETTINGS__");
          const stored = prev ? JSON.parse(prev) : {};
          window.localStorage.setItem(
            "__RECREST_TEST_SETTINGS__",
            JSON.stringify({ ...stored, ...patch }),
          );
        } catch (e) { void e; }
        return SEED.settings;
      }
      case "get_platform_info":
        return { platform: "windows", osVersion: "10.0.22000", arch: "x86_64", tauriVersion: "2.0.0" };
      // ThemeWrapper queries the OS truth on mount; null means "no override",
      // so the app keeps trusting matchMedia (the stub's seeded theme).
      case "get_system_dark_mode":
        return null;
      case "check_git":
        return { installed: true, version: "2.44.0" };
      case "get_system_facts":
        return {
          os: "test",
          arch: "test",
          appVersion: "0.0.0",
          osVersion: undefined,
          gitVersion: undefined,
        };
      case "update_tray_badge":
        return undefined;

      // --- updater hybrid (Part 2)
      case "check_for_update":
        return undefined;
      case "install_update":
        return undefined;

      // --- dev commands (Part 3, debug builds only — but the handler list
      // in lib.rs registers them under #[cfg(debug_assertions)], and the
      // drift spec greps the whole generate_handler! block including the
      // debug arm, so the stub must carry them too).
      case "get_dev_paths":
        return { configDir: null, dataDir: null, cacheDir: null, logDir: null };
      case "get_build_triple":
        return "windows-x86_64";
      case "dev_panic":
        return undefined;
      // The devLog forwarder (main.tsx, DEV builds) mirrors every console.*
      // call to invoke("dev_log"). Without this branch it hits the default
      // console.warn below, which the forwarder re-forwards as another
      // dev_log invoke — an unbounded loop that pegs the main thread and
      // stops the app ever rendering under the stub.
      case "dev_log":
        return undefined;

      // --- Tauri plugin: event
      case "plugin:event|listen":
        return nextId++;
      case "plugin:event|unlisten":
        return undefined;

      // --- Tauri plugin: window (titlebar controls)
      case "plugin:window|is_maximized":
      case "plugin:window|is_minimized":
      case "plugin:window|is_fullscreen":
      case "plugin:window|is_focused":
        return false;
      case "plugin:window|minimize":
      case "plugin:window|maximize":
      case "plugin:window|unmaximize":
      case "plugin:window|close":
      case "plugin:window|set_title":
      case "plugin:window|start_dragging":
      case "plugin:window|set_size":
      case "plugin:window|set_position":
        return undefined;
      case "plugin:window|current_window":
      case "plugin:window|get_current":
        return { label: "main" };
      case "plugin:window|scale_factor":
        return 1;
      case "plugin:window|inner_size":
      case "plugin:window|outer_size":
        return { width: 1440, height: 900 };
      case "plugin:window|inner_position":
      case "plugin:window|outer_position":
        return { x: 0, y: 0 };

      // --- Tauri plugin: os
      case "plugin:os|platform":
        return "windows";
      case "plugin:os|type":
        return "Windows_NT";
      case "plugin:os|version":
        return "10.0.22000";
      case "plugin:os|arch":
        return "x86_64";
      case "plugin:os|locale":
        return "en-US";

      // --- Tauri plugin: opener / shell (open external URLs, run commands)
      case "plugin:opener|open_url":
      case "plugin:opener|open_path":
      case "plugin:shell|open":
        return undefined;

      // --- Tauri plugin: store (persistence)
      case "plugin:store|load":
      case "plugin:store|get":
      case "plugin:store|set":
      case "plugin:store|save":
      case "plugin:store|delete":
      case "plugin:store|clear":
      case "plugin:store|length":
      case "plugin:store|entries":
      case "plugin:store|keys":
      case "plugin:store|values":
      case "plugin:store|has":
        return null;

      // --- Tauri plugin: app (version / name)
      case "plugin:app|version":
        return "0.1.0";
      case "plugin:app|name":
        return "Recrest";

      // --- Tauri plugin: notification / deep-link / dialog / autostart / process / updater
      case "plugin:notification|is_permission_granted":
        return true;
      case "plugin:notification|request_permission":
        return "granted";
      case "plugin:notification|notify":
        return undefined;
      case "plugin:dialog|open":
        return null;
      case "plugin:autostart|is_enabled":
        return false;
      case "plugin:autostart|enable":
      case "plugin:autostart|disable":
        return undefined;
      case "plugin:process|relaunch":
      case "plugin:process|exit":
        return undefined;
      case "plugin:updater|check":
        return { available: false };
      case "plugin:deep-link|get_current":
        return null;
      case "plugin:deep-link|register":
      case "plugin:deep-link|unregister":
        return undefined;

      default:
        console.warn("[tauri-stub] unhandled command:", cmd, args);
        return null;
    }
  }

  async function invoke(cmd, args, _options) {
    try {
      return await handleCommand(cmd, args || {});
    } catch (err) {
      console.error("[tauri-stub] invoke crashed:", cmd, err);
      return null;
    }
  }

  // Tag ourselves as a dev/browser stub so the app hides its native titlebar
  // chrome (usePlatform reads \`isTauri() && !('__RECREST_DEV_STUB__' in window)\`
  // to decide whether to paint the Win11/mac/GNOME caption controls). Without
  // this the app believes it is the real Tauri shell and renders the titlebar,
  // which shifts every visual-regression baseline and the updater-banner layout.
  Object.defineProperty(window, "__RECREST_DEV_STUB__", {
    configurable: true,
    writable: false,
    value: true,
  });
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      invoke,
      transformCallback,
      metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
      callbacks,
      convertFileSrc: (path) => path,
      unregisterListener: (_event, id) => { removeListener(id); },
      plugins: {
        event: {
          listen: (event, _target, handler) => registerEventListener(event, handler),
          unlisten: (_event, id) => { removeListener(id); },
          unregisterListener: (_event, id) => { removeListener(id); },
        },
      },
    },
  });
  // \`@tauri-apps/api/event::_unlisten\` reaches for
  // \`__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener\` directly. Without
  // this global, every component that calls \`listen()\` throws on cleanup.
  Object.defineProperty(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      unregisterListener: (_event, id) => { removeListener(id); },
    },
  });
  Object.defineProperty(window, "__TAURI_OS_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: { platform: "windows", version: "10.0.22000", family: "windows", arch: "x86_64" },
  });
})();
`;
}
