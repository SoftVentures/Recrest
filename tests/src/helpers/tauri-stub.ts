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
  let nextId = 1;

  function transformCallback(callback, once = false) {
    const id = nextId++;
    callbacks.set(id, (arg) => {
      if (once) callbacks.delete(id);
      try { callback?.(arg); } catch (err) { console.warn("[tauri-stub] callback err:", err); }
    });
    return id;
  }

  function resolveRecentCommits(args) {
    const repoId = args && args.repoId;
    if (!repoId) return [];
    return (SEED.recentCommits && SEED.recentCommits[repoId]) || [];
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
          status: SEED.repos[0]?.status ?? null,
        };
        return repo;
      }
      case "remove_repo":
        return undefined;
      case "list_recent_commits":
        return resolveRecentCommits(args);
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
      case "find_across_repos":
        return { matches: [], truncated: false };

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
      case "set_provider_token":
      case "set_provider_base_url":
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

      // --- notifications / oauth / settings / window / system
      case "notify":
        return undefined;
      case "begin_oauth":
        return { authorizationUrl: "about:blank", state: "stub" };
      case "complete_oauth":
        return undefined;
      case "get_settings":
        return SEED.settings;
      case "update_settings":
        return undefined;
      case "save_window_state":
        return undefined;
      case "load_window_state":
        return null;
      case "validate_window_position":
        return true;
      case "get_platform_info":
        return { platform: "windows", osVersion: "10.0.22000", arch: "x86_64", tauriVersion: "2.0.0" };
      case "check_git":
        return { installed: true, version: "2.44.0" };
      case "update_tray_badge":
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

  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      invoke,
      transformCallback,
      metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
      callbacks,
      convertFileSrc: (path) => path,
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
