/**
 * Dev-only stub for `yarn dev:web`.
 *
 * Installs a fake `window.__TAURI_INTERNALS__` so the React app can run
 * end-to-end in a plain browser without the Tauri runtime. Every IPC call
 * routed through `app/src/lib/tauri.ts::invoke` resolves against the seed
 * data declared in `./seed/`, which mirrors the Playwright fixture seed
 * (`tests/src/helpers/seed/`). The result is that the repo list, PR cards,
 * dashboard widgets and settings page all populate with realistic data
 * during browser-based smoke testing.
 *
 * Production safety:
 *  - The whole module is gated by `import.meta.env.DEV` at the call site
 *    (see `app/src/main.tsx`). Vite tree-shakes the import in production
 *    builds, so the seed data and stub plumbing never ship to users.
 *  - The call site also guards on `!('__TAURI_INTERNALS__' in window)` so
 *    Playwright tests (which install their own stub via `addInitScript`
 *    before the page loads) and the real Tauri shell are never overridden.
 *
 * Keep parity with the Playwright stub at `tests/src/helpers/tauri-stub.ts`.
 * When the backend grows a new command the matching branch must land here
 * too — otherwise `dev:web` silently returns `null` and shows empty UI.
 */
import { type AppSeed, DEFAULT_SEED } from "@/lib/dev/seed";

type Required_<T> = { [K in keyof T]-?: NonNullable<T[K]> };

interface DevPullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  author: string;
  state: "open" | "merged" | "closed" | string;
  draft: boolean;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  ciStatus: string;
}

interface DevRepo {
  id: string;
  name: string;
  remoteUrl: string | null;
  status: { head?: string | null } & Record<string, unknown>;
}

function installStub(seed: Required_<AppSeed>): void {
  const SEED = seed as unknown as {
    repos: DevRepo[];
    groups: Record<string, unknown>;
    prs: Record<string, DevPullRequest[]>;
    recentCommits: Record<string, Array<{ timestamp: string }>>;
    providers: Record<string, unknown>;
    settings: unknown;
  };

  const callbacks = new Map<number, (arg: unknown) => void>();
  let nextId = 1;

  function transformCallback(callback?: (arg: unknown) => void, once = false): number {
    const id = nextId++;
    callbacks.set(id, (arg) => {
      if (once) callbacks.delete(id);
      try {
        callback?.(arg);
      } catch (err) {
        console.warn("[dev-tauri-stub] callback err:", err);
      }
    });
    return id;
  }

  function resolveRecentCommits(args: { repoId?: string } | undefined) {
    const repoId = args?.repoId;
    const buckets = SEED.recentCommits || {};
    if (repoId) return buckets[repoId] || [];
    const all: Array<{ timestamp: string }> = [];
    for (const id of Object.keys(buckets)) {
      for (const c of buckets[id] || []) all.push(c);
    }
    all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return all;
  }

  function resolvePrEvents(args: { repoId?: string; days?: number } | undefined) {
    const days = args?.days || 14;
    const cutoffMs = Date.now() - days * 86_400_000;
    const out: Array<Record<string, unknown>> = [];
    const prsByRepo = SEED.prs || {};
    const filterRepoId = args?.repoId;
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
        author: "valentin",
        url,
        timestamp: new Date(nowMs - (d + 1) * 86_400_000).toISOString(),
        kind: "opened",
      });
      out.push({
        repoId: repo.id,
        repoName: repo.name,
        number: num,
        title,
        author: "valentin",
        url,
        timestamp: ts,
        kind: "merged",
      });
    }
    return out;
  }

  function resolveCheckRuns(args: { repoId?: string } | undefined) {
    const repoId = args?.repoId;
    const repo = repoId ? SEED.repos.find((r) => r.id === repoId) : null;
    if (!repo) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Array<Record<string, unknown>> = [];
    let h = 0;
    for (let i = 0; i < repo.id.length; i++) h = (h * 31 + repo.id.charCodeAt(i)) >>> 0;
    for (let d = 0; d < 14; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - d);
      const dayStr = day.toISOString().slice(0, 10);
      const seedA = ((h ^ (d * 2654435761)) >>> 0) % 100;
      if (seedA < 15) continue;
      const total = 2 + (seedA % 6);
      const failed = seedA < 30 ? seedA % 3 : 0;
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

  function resolveStatus(repoId?: string) {
    const repo = SEED.repos.find((r) => r.id === repoId);
    return repo ? repo.status : null;
  }

  async function handleCommand(cmd: string, args: Record<string, unknown>): Promise<unknown> {
    const a = args as Record<string, never> & {
      repoId?: string;
      prNumber?: number;
      path?: string;
      groupId?: string | null;
      days?: number;
    };

    switch (cmd) {
      // --- repos
      case "scan_repos":
      case "list_repos":
        return SEED.repos;
      case "repo_status":
        return SEED.repos.find((r) => r.id === a.repoId) || null;
      case "add_repo": {
        const path = a.path || "";
        const repo = {
          id: "repo-" + Math.random().toString(36).slice(2, 10),
          name: path.split(/[\\/]/).filter(Boolean).pop() || "repo",
          path,
          groupId: a.groupId ?? null,
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
        return resolveRecentCommits(a);
      case "list_pr_events":
        return resolvePrEvents(a);
      case "list_check_runs":
        return resolveCheckRuns(a);
      case "detect_ides":
        return ["vscode"];
      case "load_logo_bytes":
        return null;
      case "open_in_ide":
      case "open_terminal":
      case "open_in_explorer":
        return undefined;

      // --- git ops
      case "git_fetch":
      case "git_pull":
      case "git_push":
      case "git_checkout":
      case "git_checkout_remote":
      case "git_branch_create":
        return resolveStatus(a.repoId);
      case "git_fetch_all":
        return SEED.repos.length;
      case "git_list_branches":
        return [
          {
            name: "main",
            isRemote: false,
            isHead: true,
            upstream: "origin/main",
            ahead: 0,
            behind: 0,
          },
          {
            name: "develop",
            isRemote: false,
            isHead: false,
            upstream: "origin/develop",
            ahead: 0,
            behind: 1,
          },
        ];
      case "git_merge":
        return { status: resolveStatus(a.repoId), conflicts: [] };
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
        return (SEED.prs && a.repoId && SEED.prs[a.repoId]) || [];
      case "get_pr_detail": {
        const list = (SEED.prs && a.repoId && SEED.prs[a.repoId]) || [];
        const base = list.find((pr) => pr.number === a.prNumber);
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
        return {
          platform: "windows",
          osVersion: "10.0.22000",
          arch: "x86_64",
          tauriVersion: "2.0.0",
        };
      case "check_git":
        return { installed: true, version: "2.44.0" };
      case "update_tray_badge":
        return undefined;

      // --- updater hybrid
      case "check_for_update":
        return undefined;
      case "install_update":
        return undefined;

      // --- dev commands
      case "get_dev_paths":
        return { configDir: null, dataDir: null, cacheDir: null, logDir: null };
      case "get_build_triple":
        return "windows-x86_64";
      case "dev_panic":
        return undefined;

      // --- Tauri plugin: event
      case "plugin:event|listen":
        return nextId++;
      case "plugin:event|unlisten":
        return undefined;

      // --- Tauri plugin: window
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

      // --- Tauri plugin: opener / shell
      case "plugin:opener|open_url":
      case "plugin:opener|open_path":
      case "plugin:shell|open":
        return undefined;

      // --- Tauri plugin: store
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

      // --- Tauri plugin: app
      case "plugin:app|version":
        return "0.1.0";
      case "plugin:app|name":
        return "Recrest";

      // --- Tauri plugin: notification / dialog / autostart / process / updater / deep-link
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
        console.warn("[dev-tauri-stub] unhandled command:", cmd, args);
        return null;
    }
  }

  async function invoke(
    cmd: string,
    args?: Record<string, unknown>,
    _options?: unknown,
  ): Promise<unknown> {
    try {
      return await handleCommand(cmd, args || {});
    } catch (err) {
      console.error("[dev-tauri-stub] invoke crashed:", cmd, err);
      return null;
    }
  }

  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      invoke,
      transformCallback,
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { windowLabel: "main", label: "main" },
      },
      callbacks,
      convertFileSrc: (path: string) => path,
      // The real Tauri runtime exposes `unregisterListener` on the internals
      // object too; some `@tauri-apps/api/event` builds reach for it via
      // `__TAURI_INTERNALS__.unregisterListener` rather than the dedicated
      // `__TAURI_EVENT_PLUGIN_INTERNALS__` global below. Mirror it here so
      // both code paths resolve.
      unregisterListener: (_event: string, id: number) => {
        callbacks.delete(id);
      },
      plugins: {
        event: {
          listen: (_event: string, _target: unknown, handler: (arg: unknown) => void) =>
            transformCallback(handler),
          unlisten: (_event: string, id: number) => {
            callbacks.delete(id);
          },
          unregisterListener: (_event: string, id: number) => {
            callbacks.delete(id);
          },
        },
      },
    },
  });
  // The real `@tauri-apps/api/event::_unlisten` calls
  // `window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, id)`
  // directly. Without this global the cleanup of every `listen()` subscription
  // throws `Cannot read properties of undefined (reading 'unregisterListener')`,
  // which fires on every component unmount that registered an event listener
  // (e.g. `useRepos`).
  Object.defineProperty(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      unregisterListener: (_event: string, id: number) => {
        callbacks.delete(id);
      },
    },
  });
  Object.defineProperty(window, "__TAURI_OS_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      platform: "windows",
      version: "10.0.22000",
      family: "windows",
      arch: "x86_64",
    },
  });
}

/**
 * Install the dev-only Tauri stub. Idempotent: calling twice is a no-op
 * because `__TAURI_INTERNALS__` is non-writable after the first install.
 */
export function installDevTauriStub(): void {
  installStub(DEFAULT_SEED as Required_<AppSeed>);
  const repoCount = DEFAULT_SEED.repos.length;
  const prCount = Object.values(DEFAULT_SEED.prs).reduce((sum, list) => sum + list.length, 0);
  console.info(
    `[dev] Tauri stub installed with seed (${repoCount} repos, ${prCount} pull requests)`,
  );
}
