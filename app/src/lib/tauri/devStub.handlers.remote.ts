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
      // Mirror the Rust debug behaviour (`oauth_visible`): any dev/demo build
      // always surfaces the "Connect via browser" affordance so the simulated
      // OAuth handshake is reachable. Only matters for disconnected providers
      // (connected rows show "Disconnect" regardless).
      return Object.values(seed.providers || {}).map((c) => ({
        ...(c as Record<string, unknown>),
        supportsOauth: true,
      }));

    case "set_provider_token":
    case "set_provider_base_url":
    case "clear_provider_token":
      return undefined;

    case "ping_provider": {
      const provider = String(a.provider ?? "");
      const baseUrl = String(a.baseUrl ?? "").trim();
      if (!baseUrl) {
        return {
          reachable: false,
          looksLikeProvider: false,
          version: null,
          error: "empty base url",
        };
      }
      // Demo heuristics: a URL containing the provider's name OR an obvious
      // cloud host is treated as reachable + provider-shaped. Anything with
      // "kyrillix" (the canonical "user typed nonsense" sentinel used by the
      // demo) is reachable but flagged as non-provider so the UI can show
      // the matching error state.
      const looksBogus = /kyrillix|notreal|example\.invalid/i.test(baseUrl);
      const namedProvider =
        new RegExp(`\\b${provider}\\b`, "i").test(baseUrl) ||
        /api\.(github|gitlab|bitbucket)\b/i.test(baseUrl) ||
        baseUrl.includes("gitlab.com") ||
        baseUrl.includes("github.com") ||
        baseUrl.includes("bitbucket.org");
      return {
        reachable: true,
        looksLikeProvider: !looksBogus && namedProvider,
        version: provider === "gitlab" && !looksBogus ? "17.2.0-ee" : null,
        error: null,
      };
    }

    case "verify_credentials": {
      const token = String(a.token ?? "");
      const providerId = String(a.provider ?? "github");
      const baseUrl = a.baseUrl as string | null | undefined;
      const username = (a.username as string | null | undefined) ?? "";
      // Demo heuristics so the live demo can showcase each error branch
      // without needing a real backend:
      //   - "1234" → unauthorized
      //   - obviously-non-provider URL → not-provider-response
      //   - empty token → unauthorized
      //   - otherwise → success, login mirrors any provided username
      if (!token.trim() || token === "1234") {
        // Throw the serialized error so the renderer catch-branch sees it
        // exactly like Tauri would deliver it.
        throw { kind: "unauthorized" };
      }
      const looksBogus =
        typeof baseUrl === "string" &&
        baseUrl.length > 0 &&
        !/\b(github|gitlab|bitbucket)\b/i.test(baseUrl);
      if (looksBogus) {
        throw {
          kind: "not-provider-response",
          hint: `demo: base URL does not look like ${providerId}`,
        };
      }
      return {
        login: username || `${providerId}-demo-user`,
      };
    }

    case "fetch_pull_requests": {
      const repoId = a.repoId as string | undefined;
      return (seed.prs && repoId && seed.prs[repoId]) || [];
    }

    default:
      return UNHANDLED;
  }
}
