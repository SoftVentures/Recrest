// Dev:web stub handlers for repo CRUD + recent commits / PR events / CI runs
// + IDE/terminal/explorer launchers + SSH-key + logo affordances.
import { ACTIVITY_COMMITS_CHUNK_EVENT, TauriCommand } from "@recrest/shared";

import {
  resolveCheckRuns,
  resolveCommitsInRange,
  resolveOldestCommitDate,
  resolvePrEvents,
  resolveRecentCommits,
} from "@/lib/tauri/devStub.derived";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import type { DevStubState } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

/** Optional context the dispatcher passes so this handler can deliver the
 *  `activity://commits-chunk` stream the real backend emits. */
export interface ReposStubContext {
  emit: (event: string, payload: unknown) => void;
}

export function reposStub(
  cmd: string,
  a: Args,
  state: DevStubState,
  ctx?: ReposStubContext,
): unknown | typeof UNHANDLED {
  const seed = state.seed;

  switch (cmd) {
    case "scan_repos":
    case "list_repos":
      return seed.repos;

    case "repo_status":
      return seed.repos.find((r) => r.id === a.repoId) || null;

    case "add_repo": {
      const path = (a.path as string | undefined) ?? "";
      const repo = {
        id: "repo-" + Math.random().toString(36).slice(2, 10),
        name: path.split(/[\\/]/).filter(Boolean).pop() || "repo",
        path,
        groupId: (a.groupId as string | null | undefined) ?? null,
        remoteUrl: null,
        providerId: null,
        logoPath: null,
        logoDarkPath: null,
        sshKeyPath: null,
        status: seed.repos[0]?.status ?? null,
      };
      return repo;
    }

    case "remove_repo":
      return undefined;

    case "forget_repos_under_path": {
      // Mirror the Rust prune so dev:web removes the right repos and returns
      // an id array (a null here would make the reducer's `for…of` throw).
      const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "");
      const under = (child: string, root: string) => {
        if (!root) return false;
        const c = norm(child);
        const r = norm(root);
        return c === r || c.startsWith(r + "/");
      };
      const removed = String((a.removedPath as string | undefined) ?? "");
      const remaining = ((a.remainingPaths as string[] | undefined) ?? []).map(String);
      const ids = seed.repos
        .filter((r) => under(r.path, removed) && !remaining.some((rem) => under(r.path, rem)))
        .map((r) => r.id);
      seed.repos = seed.repos.filter((r) => !ids.includes(r.id));
      return ids;
    }

    case "delete_repo":
      // dev:web has no filesystem — pretend the trash move succeeded.
      return undefined;

    case "list_recent_commits":
      return resolveRecentCommits(seed, a as { repoId?: string });

    case TauriCommand.LIST_COMMITS: {
      // Range query: filter the same seed feed `list_recent_commits` uses to
      // `since <= ts <= until`, then stream one chunk per repo over the
      // `activity://commits-chunk` event (the only path the frontend consumes
      // commit data through). The chunks MUST fire before the summary
      // resolves: the real backend emits while the command is still running,
      // and the activity reducer drops chunks whose requestId no longer
      // matches the in-flight request (fulfilled clears it). A deferred
      // setTimeout emit would arrive after fulfilled and be dropped as stale.
      const requestId = String(a.requestId ?? "");
      const grouped = resolveCommitsInRange(
        seed,
        a as { since?: string; until?: string; maxCommitsPerRepo?: number },
      );
      const totals: Record<string, number> = {};
      const truncated: Record<string, boolean> = {};
      for (const { repoId, commits } of grouped) {
        totals[repoId] = commits.length;
        truncated[repoId] = false;
      }
      if (ctx) {
        for (const { repoId, commits } of grouped) {
          ctx.emit(ACTIVITY_COMMITS_CHUNK_EVENT, {
            requestId,
            repoId,
            commits,
            done: true,
            truncated: false,
          });
        }
      }
      return { requestId, totals, truncated };
    }

    case TauriCommand.GET_OLDEST_COMMIT_DATE:
      return resolveOldestCommitDate(seed);

    case "list_pr_events":
      return resolvePrEvents(seed, a as { repoId?: string; days?: number });

    case "list_check_runs":
      return resolveCheckRuns(seed, a as { repoId?: string });

    case "detect_ides":
      return ["vscode"];

    case "load_logo_bytes":
      return null;

    case "open_in_ide":
    case "open_terminal":
    case "open_in_explorer":
      return undefined;

    case "set_repo_ssh_key": {
      const idx = seed.repos.findIndex((r) => r.id === a.repoId);
      // Replace with a fresh object so the subsequent repo_status returns a
      // new reference the store can detect — matching how the real backend
      // round-trips a freshly serialized DTO.
      if (idx >= 0)
        seed.repos[idx] = {
          ...seed.repos[idx]!,
          sshKeyPath: (a.keyPath as string | null | undefined) ?? null,
        };
      return undefined;
    }

    case "set_repo_logo": {
      // The dev stub has no filesystem to copy into — flip the flag so the
      // UI's "Reset" affordance shows up and confirms the happy path renders.
      const idx = seed.repos.findIndex((r) => r.id === a.repoId);
      if (idx >= 0) {
        seed.repos[idx] = {
          ...seed.repos[idx]!,
          logoPath: `dev-stub://repo-logos/${a.repoId as string}`,
          logoIsCustom: true,
        };
      }
      return seed.repos[idx] ?? null;
    }

    case "clear_repo_logo": {
      const idx = seed.repos.findIndex((r) => r.id === a.repoId);
      if (idx >= 0) {
        seed.repos[idx] = {
          ...seed.repos[idx]!,
          logoPath: null,
          logoIsCustom: false,
        };
      }
      return seed.repos[idx] ?? null;
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

    case "find_across_repos":
      return { matches: [], truncated: false };

    default:
      return UNHANDLED;
  }
}
