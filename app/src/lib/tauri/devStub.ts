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
import { PrEventKind, PrState } from "@recrest/shared";

import { Provider } from "@/lib/constants/providers.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { type AppSeed, DEFAULT_SEED } from "@/lib/dev/seed";
import { SEED_ORGS, SEED_REMOTE_LISTINGS } from "@/lib/dev/seed/remote";
import { UNHANDLED, providerFeatureStub } from "@/lib/tauri/devStub.providers";

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
  sshKeyPath?: string | null;
  logoPath?: string | null;
  logoIsCustom?: boolean;
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

  // --- Plan 3 stub state. Kept here (not at module top) so each `installStub`
  // call starts from a clean slate but state survives across IPC calls within
  // a session — the WorkingCopyPanel / GitConfigTab show their flows without
  // needing a real backend round-trip.
  interface StubStashEntry {
    index: number;
    message: string;
    oid: string;
  }
  const STUB_STASH_BY_REPO = new Map<string, StubStashEntry[]>();
  const STUB_GLOBAL_GIT_CONFIG: Record<string, string> = {
    "user.name": "Dev Stub",
    "user.email": "dev@example.invalid",
  };
  // Mark a single dev repo as having a pre-commit hook so the CommitDialog
  // "Hooks active" badge has something to show without a real .git/hooks/.
  const STUB_PRE_COMMIT_HOOK_REPOS = new Set<string>(["repo-octo-notes"]);

  function isStubProtected(path: string): boolean {
    const name = path.split("/").pop() ?? path;
    return (
      name === ".env" ||
      name === ".npmrc" ||
      name.startsWith(".env.") ||
      name.startsWith("id_") ||
      name.endsWith(".pem") ||
      name.endsWith(".key") ||
      name.endsWith(".p12") ||
      name.endsWith(".pfx") ||
      name.endsWith(".jks")
    );
  }

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
            kind: PrEventKind.OPENED,
          });
        }
        if ((pr.state === PrState.MERGED || pr.state === PrState.CLOSED) && pr.updatedAt) {
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
              kind: pr.state === PrState.MERGED ? PrEventKind.MERGED : PrEventKind.CLOSED,
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

  function resolveCheckRuns(args: { repoId?: string } | undefined) {
    // The Activity page hook calls this without a `repoId` (it passes
    // `{ commits: [...] }` instead) — fan out across every seed repo so the
    // CI Health / Pass Rate / Flaky cards actually have data to render.
    const repoId = args?.repoId;
    const repos = repoId ? SEED.repos.filter((r) => r.id === repoId) : SEED.repos;
    if (repos.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Array<Record<string, unknown>> = [];
    for (const repo of repos) {
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
      keyPath?: string | null;
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
          sshKeyPath: null,
          status: SEED.repos[0]?.status ?? null,
        };
        return repo;
      }
      case "remove_repo":
        return undefined;
      case "delete_repo":
        // dev:web has no filesystem — pretend the trash move succeeded.
        // The frontend slice's `deleteRepo.fulfilled` then prunes the repo
        // from `state.items` so the UI mirrors a real successful delete.
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
      case "git_list_branches": {
        const repoId = (a.repoId as string) ?? "";
        const repo = SEED.repos.find((r) => r.id === repoId);
        const headBranch = repo?.status?.branch ?? "main";
        const ahead = repo?.status?.ahead ?? 0;
        const behind = repo?.status?.behind ?? 0;
        const now = Date.now();
        const cIso = (daysAgo: number) => new Date(now - daysAgo * 86400_000).toISOString();
        const headCommit = {
          sha: "abc1234",
          shortSha: "abc1234",
          subject: "feat: latest work on branch",
          author: "Sasha",
          authoredAt: cIso(1),
        };
        const altCommit = {
          sha: "def5678",
          shortSha: "def5678",
          subject: "chore: keep develop in sync",
          author: "Sasha",
          authoredAt: cIso(3),
        };
        return [
          {
            name: headBranch,
            isCurrent: true,
            isRemote: false,
            remote: null,
            upstream: `origin/${headBranch}`,
            ahead,
            behind,
            clean: ahead === 0 && behind === 0,
            lastCommit: headCommit,
          },
          {
            name: "develop",
            isCurrent: false,
            isRemote: false,
            remote: null,
            upstream: "origin/develop",
            ahead: 0,
            behind: 0,
            clean: true,
            lastCommit: altCommit,
          },
          {
            name: "main",
            isCurrent: false,
            isRemote: true,
            remote: "origin",
            upstream: null,
            ahead: 0,
            behind: 0,
            clean: true,
            lastCommit: headCommit,
          },
        ];
      }
      case "git_merge":
        return { status: resolveStatus(a.repoId), conflicts: [] };
      case "git_clone":
        return SEED.repos[0] ?? null;

      // --- working copy (Plan 3 / C.1-C.2)
      case "git_stage":
      case "git_unstage":
      case "git_commit":
        return resolveStatus(a.repoId);
      case "git_discard": {
        const paths = ((a.paths as string[] | undefined) ?? []).slice();
        const force = !!a.force;
        const protectedHits = force ? [] : paths.filter(isStubProtected);
        return {
          discarded: paths.filter((p) => !protectedHits.includes(p)),
          requiresConfirmation: protectedHits,
          status: resolveStatus(a.repoId),
        };
      }
      case "git_stash": {
        const repoId = (a.repoId as string) ?? "";
        const list = STUB_STASH_BY_REPO.get(repoId) ?? [];
        list.unshift({
          index: 0,
          message: (a.message as string | null | undefined) ?? "WIP on dev: stub stash",
          oid: `stub-${Date.now().toString(36)}`,
        });
        STUB_STASH_BY_REPO.set(
          repoId,
          list.map((e, i) => ({ ...e, index: i })),
        );
        return resolveStatus(repoId);
      }
      case "git_stash_list":
        return STUB_STASH_BY_REPO.get((a.repoId as string) ?? "") ?? [];
      case "git_stash_pop":
      case "git_stash_drop": {
        const repoId = (a.repoId as string) ?? "";
        const idx = (a.index as unknown as number | undefined) ?? 0;
        const list = (STUB_STASH_BY_REPO.get(repoId) ?? []).filter((e) => e.index !== idx);
        STUB_STASH_BY_REPO.set(
          repoId,
          list.map((e, i) => ({ ...e, index: i })),
        );
        return resolveStatus(repoId);
      }
      case "git_has_pre_commit_hook":
        return STUB_PRE_COMMIT_HOOK_REPOS.has((a.repoId as string) ?? "");

      // --- git config (Plan 3 / C.3)
      case "get_git_config":
        return {
          scope: a.repoId == null ? "global" : "repo",
          entries: a.repoId == null ? { ...STUB_GLOBAL_GIT_CONFIG } : {},
        };
      case "set_git_config": {
        if (a.repoId == null) {
          const key = (a.key as unknown as string | undefined) ?? "";
          const value = (a.value as unknown as string | undefined) ?? "";
          if (value === "") delete STUB_GLOBAL_GIT_CONFIG[key];
          else STUB_GLOBAL_GIT_CONFIG[key] = value;
        }
        return {
          scope: a.repoId == null ? "global" : "repo",
          entries: a.repoId == null ? { ...STUB_GLOBAL_GIT_CONFIG } : {},
        };
      }

      // --- search
      case "find_across_repos":
        return { matches: [], truncated: false };

      // --- remote import
      case "list_remote_repositories": {
        const providerId = (a.providerId as string | undefined) ?? Provider.GITHUB;
        const orgSlug = (a.orgSlug as string | null | undefined) ?? null;
        const key = `${providerId}::${orgSlug ?? "__self__"}`;
        const repositories = SEED_REMOTE_LISTINGS[key] ?? [];
        // Mark anything already in the local repo list as "on system".
        const localMatches: Record<string, string> = {};
        for (const rr of repositories) {
          const local = SEED.repos.find(
            (lr) => (lr.remoteUrl ?? "").includes(rr.fullName) || lr.name === rr.name,
          );
          if (local) localMatches[rr.id] = local.id;
        }
        return { repositories, localMatches };
      }
      case "list_remote_organizations": {
        const providerId = (a.providerId as string | undefined) ?? Provider.GITHUB;
        return (SEED_ORGS as Record<string, unknown>)[providerId] ?? [];
      }
      case "clone_remote_repository":
        return SEED.repos[0] ?? null;
      case "clone_remote_repositories_bulk": {
        const requests = (a.requests as Array<{ remoteRepoId: string }> | undefined) ?? [];
        return requests.map((r) => ({ remoteRepoId: r.remoteRepoId, ok: true, error: null }));
      }
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
        // A realistic Dependabot-shaped markdown body so dev:web can verify the
        // MarkdownView + ExpandableContent behaviour without a live provider.
        // Tables, links, inline code, blockquotes and a <details> block all
        // exercise the renderer's GFM + safe-HTML paths.
        const body = `Bumps the **npm-all** group with 3 updates in the \`/\` directory.

**What changed**

- React-Redux now ships **proper TS overloads** for \`useSelector\` with default equality
- TipTap v3 dropped the legacy \`emitUpdate\` argument shape — code already migrated
- \`@tauri-apps/api\` got a new \`isTauri()\` helper we should adopt long-term

**Checklist**

1. Verify \`yarn test\` passes locally
2. Run the smoke screen on dev:web (3200)
3. Approve and merge using **Squash**

Quick links: [release notes](https://github.com/reduxjs/redux-toolkit/releases) · [diff](https://github.com/reduxjs/redux-toolkit/compare/v2.11.2...v2.12.0)

---

### Package table

| Package | From | To |
| --- | --- | --- |
| [@reduxjs/toolkit](https://github.com/reduxjs/redux-toolkit) | \`2.11.2\` | \`2.12.0\` |
| [@tauri-apps/api](https://github.com/tauri-apps/tauri) | \`2.10.1\` | \`2.11.0\` |
| [react](https://github.com/facebook/react) | \`19.2.5\` | \`19.2.6\` |

Updates \`@reduxjs/toolkit\` from 2.11.2 to 2.12.0.

<details>
<summary>Release notes</summary>

> Sourced from [@reduxjs/toolkit's releases](https://github.com/reduxjs/redux-toolkit/releases).

### v2.12.0

This feature release adds three new helpers and tightens up several existing ones.

- Adds \`createListenerMiddleware().clearListeners()\`
- Fixes a bug where \`combineSlices\` would drop typing under \`exactOptionalPropertyTypes\`
- Improves devtool action labels for nested \`createAsyncThunk\` calls

</details>

<details>
<summary>Commits</summary>

- See full diff [here](https://github.com/reduxjs/redux-toolkit/compare/v2.11.2...v2.12.0).

</details>

---

Dependabot will resolve any conflicts with this PR as long as you don't alter it yourself.
You can also trigger a rebase manually by commenting \`@dependabot rebase\`.`;
        // A tiny synthetic timeline so the Timeline card has something to
        // render in dev:web (avatar + locale date + body) without a live
        // provider.
        const t0 = Date.now() - 3 * 86_400_000;
        const timeline = [
          {
            id: "ev-open",
            type: "opened",
            actor: base.author,
            at: new Date(t0).toISOString(),
            body: null,
          },
          {
            id: "ev-commit",
            type: "commit",
            actor: base.author,
            at: new Date(t0 + 4 * 3_600_000).toISOString(),
            body: "Push `feat/landing-hero` → 3 commits",
          },
          {
            id: "ev-review",
            type: "review_requested",
            actor: "lea",
            at: new Date(t0 + 26 * 3_600_000).toISOString(),
            body: null,
          },
          {
            id: "ev-comment",
            type: "commented",
            actor: "lea",
            at: new Date(t0 + 28 * 3_600_000).toISOString(),
            body: "Looks great overall — a couple of nits inline.",
          },
        ];
        // Dev-only reviewer set so the drawer / MR detail can demo the
        // chip layout and the "show name, fall back to login" behaviour.
        const reviewers = [
          {
            login: "lea",
            name: "Lea Ramirez",
            avatarUrl: null,
            state: "approved" as const,
          },
          {
            login: "octocat",
            name: null,
            avatarUrl: null,
            state: "pending" as const,
          },
        ];
        return { ...base, body, mergeable: true, reviewers, files: [], timeline };
      }
      case "get_pr_diff":
      case "post_pr_comment":
      case "list_workflows":
      case "list_workflow_runs":
      case "trigger_workflow":
      case "cancel_workflow_run":
      case "get_pages_status": {
        // Plan 03/04 provider-depth stubs live in a sibling module to keep
        // this file under the line ceiling.
        const stub = providerFeatureStub(cmd, a);
        return stub === UNHANDLED ? undefined : stub;
      }

      // --- notifications / oauth / settings / window / system
      case "notify":
        return undefined;
      case "begin_oauth":
        return { authorizationUrl: "about:blank", state: "stub" };
      case "complete_oauth":
        return undefined;
      case "get_settings": {
        // dev:web persistence: real Tauri persists settings.json on disk, so
        // a reload preserves the user's choices. The stub used to return the
        // raw SEED on every load, which meant any user change (theme, locale,
        // accent) flashed back to seed defaults on reload — including the
        // anti-flash inline script's `recrest:theme` cache, because
        // `useThemeAttribute` mirrored the freshly-seeded state right back
        // into localStorage. Mirror persistence behaviour with a localStorage
        // overlay so dev:web matches the prod desktop experience.
        try {
          const raw = window.localStorage.getItem(StorageKey.DEV_SETTINGS);
          if (raw) {
            const stored = JSON.parse(raw) as Record<string, unknown>;
            SEED.settings = { ...(SEED.settings as object), ...stored };
          }
        } catch {
          /* corrupt JSON or quota — fall back to seed */
        }
        return SEED.settings;
      }
      case "update_settings": {
        // Real Tauri command returns the patched AppSettings. The stub used
        // to return undefined, which silently no-op'd settings-slice updates
        // (Object.assign(state, undefined) does nothing) — so toggling things
        // like repoListViewMode never propagated in dev:web. Mirror prod
        // semantics: apply the patch onto SEED.settings and return it.
        // Also mirror the merged settings into localStorage so the next
        // `get_settings` (next reload) returns the user's last state — see
        // `get_settings` above for the why.
        const patch = (a.patch ?? {}) as Record<string, unknown>;
        const current = (SEED.settings ?? {}) as Record<string, unknown>;
        SEED.settings = { ...current, ...patch };
        try {
          window.localStorage.setItem(StorageKey.DEV_SETTINGS, JSON.stringify(SEED.settings));
        } catch {
          /* quota or blocked storage — non-fatal */
        }
        return SEED.settings;
      }
      case "save_window_state":
        return undefined;
      case "load_window_state":
        return null;
      case "validate_window_position":
        return true;
      case "get_platform_info": {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isMac = /Mac|iPhone|iPad/i.test(ua);
        const isLinux = /Linux|X11/i.test(ua) && !/Win/i.test(ua);
        return {
          os: isMac ? "macos" : isLinux ? "linux" : "windows",
          arch: "x86_64",
          version: isMac ? "15.0" : isLinux ? "6.5" : "11",
          family: isMac || isLinux ? "unix" : "windows",
          debugAssertions: true,
        };
      }
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
        return {
          configDir: "~/Library/Application Support/Recrest (dev)",
          dataDir: "~/Library/Application Support/Recrest (dev)",
          cacheDir: "~/Library/Caches/Recrest (dev)",
          logDir: "~/Library/Logs/Recrest (dev)",
        };
      case "get_build_triple": {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isMac = /Mac|iPhone|iPad/i.test(ua);
        const isLinux = /Linux|X11/i.test(ua) && !/Win/i.test(ua);
        const os = isMac ? "darwin" : isLinux ? "linux" : "windows";
        return `${os}-x86_64`;
      }
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
      case "plugin:os|platform": {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        if (/Mac|iPhone|iPad/i.test(ua)) return "macos";
        if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "linux";
        return "windows";
      }
      case "plugin:os|type": {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        if (/Mac|iPhone|iPad/i.test(ua)) return "Darwin";
        if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "Linux";
        return "Windows_NT";
      }
      case "plugin:os|version":
        return "1.0.0";
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
        return "0.7.0";
      case "plugin:app|name":
        return "Recrest";
      case "plugin:app|tauri_version":
        return "2.0.0";

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
      case "plugin:window|set_min_size":
      case "plugin:window|set_max_size":
      case "set_caption_button_bounds":
        return undefined;

      case "set_repo_ssh_key": {
        const idx = SEED.repos.findIndex((r) => r.id === a.repoId);
        // Replace with a fresh object (not an in-place mutation) so the
        // subsequent repo_status returns a new reference the store can detect —
        // matching how the real backend round-trips a freshly serialized DTO.
        if (idx >= 0) SEED.repos[idx] = { ...SEED.repos[idx]!, sshKeyPath: a.keyPath ?? null };
        return undefined;
      }
      case "set_repo_logo": {
        // The dev stub has no filesystem to copy into — we just flip the
        // flag so the UI's "Reset" affordance shows up and confirms the
        // happy path renders. The actual image bytes remain unfetchable.
        const idx = SEED.repos.findIndex((r) => r.id === a.repoId);
        if (idx >= 0) {
          SEED.repos[idx] = {
            ...SEED.repos[idx]!,
            logoPath: `dev-stub://repo-logos/${a.repoId}`,
            logoIsCustom: true,
          };
        }
        return SEED.repos[idx] ?? null;
      }
      case "clear_repo_logo": {
        const idx = SEED.repos.findIndex((r) => r.id === a.repoId);
        if (idx >= 0) {
          SEED.repos[idx] = {
            ...SEED.repos[idx]!,
            logoPath: null,
            logoIsCustom: false,
          };
        }
        return SEED.repos[idx] ?? null;
      }
      case "ssh_unlock_key":
        return undefined;
      case "list_ssh_keys":
        return {
          dir: "/Users/dev/.ssh",
          keys: [
            { path: "/Users/dev/.ssh/id_ed25519", name: "id_ed25519", hasPublic: true },
            { path: "/Users/dev/.ssh/id_rsa", name: "id_rsa", hasPublic: true },
          ],
        };

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

  // Marker so callers can distinguish "real Tauri runtime" from "browser
  // running with the dev stub installed". The titlebar dispatcher hides
  // the chrome when this is true — the browser already paints its own.
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
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const detectedPlatform = /Mac|iPhone|iPad/i.test(ua)
    ? "macos"
    : /Linux|X11/i.test(ua) && !/Win/i.test(ua)
      ? "linux"
      : "windows";
  Object.defineProperty(window, "__TAURI_OS_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      platform: detectedPlatform,
      version: "1.0.0",
      family:
        detectedPlatform === "windows" ? "windows" : detectedPlatform === "linux" ? "unix" : "unix",
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
