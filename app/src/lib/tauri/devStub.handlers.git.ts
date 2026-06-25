// Dev:web stub handlers for git operations (branches, working copy, stash).
import { resolveStatus } from "@/lib/tauri/devStub.derived";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevStubState, isStubProtected } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

export function gitStub(cmd: string, a: Args, state: DevStubState): unknown | typeof UNHANDLED {
  const seed = state.seed;

  switch (cmd) {
    case "git_fetch":
    case "git_pull":
    case "git_push":
    case "git_checkout":
    case "git_checkout_remote":
    case "git_branch_create":
      return resolveStatus(seed, a.repoId as string | undefined);

    case "git_fetch_all":
    case "git_pull_all":
      return seed.repos.length;

    case "git_list_branches": {
      const repoId = (a.repoId as string) ?? "";
      const repo = seed.repos.find((r) => r.id === repoId);
      const headBranch = (repo?.status?.branch as string | undefined) ?? "main";
      const ahead = (repo?.status?.ahead as number | undefined) ?? 0;
      const behind = (repo?.status?.behind as number | undefined) ?? 0;
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
      return { status: resolveStatus(seed, a.repoId as string | undefined), conflicts: [] };

    case "git_clone":
      return seed.repos[0] ?? null;

    case "git_stage":
    case "git_unstage":
    case "git_commit":
      return resolveStatus(seed, a.repoId as string | undefined);

    case "git_discard": {
      const paths = ((a.paths as string[] | undefined) ?? []).slice();
      const force = !!a.force;
      const protectedHits = force ? [] : paths.filter(isStubProtected);
      return {
        discarded: paths.filter((p) => !protectedHits.includes(p)),
        requiresConfirmation: protectedHits,
        status: resolveStatus(seed, a.repoId as string | undefined),
      };
    }

    case "git_stash": {
      const repoId = (a.repoId as string) ?? "";
      const list = state.stashByRepo.get(repoId) ?? [];
      list.unshift({
        index: 0,
        message: (a.message as string | null | undefined) ?? "WIP on dev: stub stash",
        oid: `stub-${Date.now().toString(36)}`,
      });
      state.stashByRepo.set(
        repoId,
        list.map((e, i) => ({ ...e, index: i })),
      );
      return resolveStatus(seed, repoId);
    }

    case "git_stash_list":
      return state.stashByRepo.get((a.repoId as string) ?? "") ?? [];

    case "git_stash_pop":
    case "git_stash_drop": {
      const repoId = (a.repoId as string) ?? "";
      const idx = (a.index as number | undefined) ?? 0;
      const list = (state.stashByRepo.get(repoId) ?? []).filter((e) => e.index !== idx);
      state.stashByRepo.set(
        repoId,
        list.map((e, i) => ({ ...e, index: i })),
      );
      return resolveStatus(seed, repoId);
    }

    case "git_has_pre_commit_hook":
      return state.preCommitHookRepos.has((a.repoId as string) ?? "");

    default:
      return UNHANDLED;
  }
}
