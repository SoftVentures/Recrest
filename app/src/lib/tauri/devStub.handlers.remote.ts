// Dev:web stub handlers for the remote-repo import flow and provider list.
import { Provider } from "@/lib/constants/providers.constants";
import { SEED_ORGS, SEED_REMOTE_LISTINGS } from "@/lib/dev/seed/remote";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import type { DevStubState } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

export function remoteStub(cmd: string, a: Args, state: DevStubState): unknown | typeof UNHANDLED {
  const seed = state.seed;

  switch (cmd) {
    case "list_remote_repositories": {
      const providerId = (a.providerId as string | undefined) ?? Provider.GITHUB;
      const orgSlug = (a.orgSlug as string | null | undefined) ?? null;
      const key = `${providerId}::${orgSlug ?? "__self__"}`;
      const repositories = SEED_REMOTE_LISTINGS[key] ?? [];
      // Mark anything already in the local repo list as "on system".
      const localMatches: Record<string, string> = {};
      for (const rr of repositories) {
        const local = seed.repos.find(
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
      return seed.repos[0] ?? null;

    case "clone_remote_repositories_bulk": {
      const requests = (a.requests as Array<{ remoteRepoId: string }> | undefined) ?? [];
      return requests.map((r) => ({ remoteRepoId: r.remoteRepoId, ok: true, error: null }));
    }

    case "create_and_open_workspace":
      return undefined;

    case "list_providers":
      return Object.values(seed.providers || {});

    case "set_provider_token":
    case "set_provider_base_url":
    case "clear_provider_token":
      return undefined;

    case "fetch_pull_requests": {
      const repoId = a.repoId as string | undefined;
      return (seed.prs && repoId && seed.prs[repoId]) || [];
    }

    default:
      return UNHANDLED;
  }
}
