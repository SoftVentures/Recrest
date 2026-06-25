import { describe, expect, it } from "vitest";

import { Provider } from "@/lib/constants/providers.constants";
import { DEFAULT_SEED } from "@/lib/dev/seed";
import { SEED_ORGS, SEED_REMOTE_LISTINGS } from "@/lib/dev/seed/remote";
import { remoteStub } from "@/lib/tauri/devStub.handlers.remote";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState } from "@/lib/tauri/devStub.state";

function makeState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

describe("remoteStub", () => {
  // ─── sentinel ──────────────────────────────────────────────────────────────

  it("returns UNHANDLED for an unknown command", () => {
    const state = makeState();
    expect(remoteStub("__no_such_command__", {}, state)).toBe(UNHANDLED);
  });

  // ─── list_remote_repositories ───────────────────────────────────────────────

  describe("list_remote_repositories", () => {
    it("returns the self listing for GitHub when no orgSlug is given", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_repositories",
        { providerId: Provider.GITHUB },
        state,
      ) as { repositories: unknown[]; localMatches: Record<string, string> };

      expect(Array.isArray(result.repositories)).toBe(true);
      const expected = SEED_REMOTE_LISTINGS["github::__self__"] ?? [];
      expect(result.repositories.length).toBe(expected.length);
      expect(typeof result.localMatches).toBe("object");
    });

    it("returns the correct listing for a given orgSlug (acme-labs)", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_repositories",
        { providerId: Provider.GITHUB, orgSlug: "acme-labs" },
        state,
      ) as { repositories: unknown[] };

      const expected = SEED_REMOTE_LISTINGS["github::acme-labs"] ?? [];
      expect(result.repositories.length).toBe(expected.length);
    });

    it("returns the GitLab northwind listing", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_repositories",
        { providerId: Provider.GITLAB, orgSlug: "northwind" },
        state,
      ) as { repositories: unknown[] };
      const expected = SEED_REMOTE_LISTINGS["gitlab::northwind"] ?? [];
      expect(result.repositories.length).toBe(expected.length);
    });

    it("returns empty repositories array for an unknown org slug", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_repositories",
        { providerId: Provider.GITHUB, orgSlug: "no-such-org" },
        state,
      ) as { repositories: unknown[] };
      expect(result.repositories).toEqual([]);
    });

    it("falls back to github provider when providerId arg is omitted", () => {
      const state = makeState();
      const result = remoteStub("list_remote_repositories", {}, state) as {
        repositories: unknown[];
      };
      const expected = SEED_REMOTE_LISTINGS["github::__self__"] ?? [];
      expect(result.repositories.length).toBe(expected.length);
    });

    it("populates localMatches for repos that overlap with the local seed", () => {
      const state = makeState();
      // ledger-api is in the seed repos AND in github::acme-labs remote listing
      const result = remoteStub(
        "list_remote_repositories",
        { providerId: Provider.GITHUB, orgSlug: "acme-labs" },
        state,
      ) as { localMatches: Record<string, string> };

      // At least one remote repo should be matched to a local repo
      const matchedValues = Object.values(result.localMatches);
      expect(matchedValues.length).toBeGreaterThan(0);
      // Each matched value should be an id from the local seed
      const localIds = new Set(state.seed.repos.map((r) => r.id));
      for (const localId of matchedValues) {
        expect(localIds.has(localId)).toBe(true);
      }
    });
  });

  // ─── list_remote_organizations ──────────────────────────────────────────────

  describe("list_remote_organizations", () => {
    it("returns GitHub orgs", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_organizations",
        { providerId: Provider.GITHUB },
        state,
      ) as unknown[];
      const expected = (SEED_ORGS as Record<string, unknown>)["github"] as unknown[];
      expect(result.length).toBe(expected.length);
    });

    it("returns GitLab groups (including nested)", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_organizations",
        { providerId: Provider.GITLAB },
        state,
      ) as Array<{ slug: string }>;
      expect(result.length).toBeGreaterThan(1);
      // verify deep nesting is present
      const slugs = result.map((o) => o.slug);
      expect(slugs.some((s) => s.includes("/"))).toBe(true);
    });

    it("returns empty array for Bitbucket (no orgs in seed)", () => {
      const state = makeState();
      const result = remoteStub(
        "list_remote_organizations",
        { providerId: Provider.BITBUCKET },
        state,
      ) as unknown[];
      expect(result).toEqual([]);
    });

    it("falls back to github when providerId is omitted", () => {
      const state = makeState();
      const result = remoteStub("list_remote_organizations", {}, state) as unknown[];
      const expected = (SEED_ORGS as Record<string, unknown>)["github"] as unknown[];
      expect(result.length).toBe(expected.length);
    });
  });

  // ─── clone_remote_repository ─────────────────────────────────────────────────

  describe("clone_remote_repository", () => {
    it("returns the first seeded repo (simulating a successful clone)", () => {
      const state = makeState();
      const result = remoteStub(
        "clone_remote_repository",
        { remoteRepoId: "gh-remote-recrest" },
        state,
      );
      expect(result).toEqual(state.seed.repos[0]);
    });
  });

  // ─── clone_remote_repositories_bulk ─────────────────────────────────────────

  describe("clone_remote_repositories_bulk", () => {
    it("returns one result per request with ok=true and error=null", () => {
      const state = makeState();
      const requests = [
        { remoteRepoId: "gh-remote-recrest" },
        { remoteRepoId: "gh-remote-dotfiles" },
      ];
      const result = remoteStub("clone_remote_repositories_bulk", { requests }, state) as Array<{
        remoteRepoId: string;
        ok: boolean;
        error: null;
      }>;

      expect(result.length).toBe(2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]!.remoteRepoId).toBe(requests[i]!.remoteRepoId);
        expect(result[i]!.ok).toBe(true);
        expect(result[i]!.error).toBeNull();
      }
    });

    it("returns empty array when requests is empty", () => {
      const state = makeState();
      const result = remoteStub("clone_remote_repositories_bulk", { requests: [] }, state);
      expect(result).toEqual([]);
    });

    it("returns empty array when requests arg is omitted", () => {
      const state = makeState();
      const result = remoteStub("clone_remote_repositories_bulk", {}, state);
      expect(result).toEqual([]);
    });
  });

  // ─── create_and_open_workspace ───────────────────────────────────────────────

  describe("create_and_open_workspace", () => {
    it("returns undefined", () => {
      const state = makeState();
      expect(remoteStub("create_and_open_workspace", {}, state)).toBeUndefined();
    });
  });

  // ─── list_providers ──────────────────────────────────────────────────────────

  describe("list_providers", () => {
    it("returns an array with supportsOauth forced to true on every entry", () => {
      const state = makeState();
      const result = remoteStub("list_providers", {}, state) as Array<{
        supportsOauth: boolean;
        providerId: string;
      }>;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(Object.keys(state.seed.providers).length);
      for (const p of result) {
        expect(p.supportsOauth).toBe(true);
      }
    });

    it("preserves the original provider fields other than supportsOauth", () => {
      const state = makeState();
      const result = remoteStub("list_providers", {}, state) as Array<{
        providerId: string;
        connected: boolean;
      }>;
      const githubEntry = result.find((p) => p.providerId === Provider.GITHUB);
      expect(githubEntry).toBeDefined();
      expect(githubEntry!.connected).toBe(true);
    });

    it("returns empty array when seed has no providers", () => {
      const state = makeState();
      state.seed.providers = {};
      const result = remoteStub("list_providers", {}, state) as unknown[];
      expect(result).toEqual([]);
    });
  });

  // ─── set_provider_token / set_provider_base_url / clear_provider_token ───────

  describe.each(["set_provider_token", "set_provider_base_url", "clear_provider_token"])(
    "%s",
    (cmd) => {
      it("returns undefined", () => {
        const state = makeState();
        expect(remoteStub(cmd, { provider: Provider.GITHUB }, state)).toBeUndefined();
      });
    },
  );

  // ─── ping_provider ───────────────────────────────────────────────────────────

  describe("ping_provider", () => {
    it("returns not-reachable when baseUrl is empty", () => {
      const state = makeState();
      const result = remoteStub("ping_provider", { provider: "github", baseUrl: "" }, state) as {
        reachable: boolean;
        looksLikeProvider: boolean;
        error: string | null;
      };

      expect(result.reachable).toBe(false);
      expect(result.looksLikeProvider).toBe(false);
      expect(typeof result.error).toBe("string");
    });

    it("returns reachable+provider-shaped for a github.com URL", () => {
      const state = makeState();
      const result = remoteStub(
        "ping_provider",
        { provider: "github", baseUrl: "https://api.github.com" },
        state,
      ) as { reachable: boolean; looksLikeProvider: boolean; version: string | null; error: null };

      expect(result.reachable).toBe(true);
      expect(result.looksLikeProvider).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns reachable+not-provider for a 'kyrillix' URL", () => {
      const state = makeState();
      const result = remoteStub(
        "ping_provider",
        { provider: "github", baseUrl: "https://kyrillix.example.com" },
        state,
      ) as { reachable: boolean; looksLikeProvider: boolean };

      expect(result.reachable).toBe(true);
      expect(result.looksLikeProvider).toBe(false);
    });

    it("returns reachable+not-provider for a 'notreal' URL", () => {
      const state = makeState();
      const result = remoteStub(
        "ping_provider",
        { provider: "github", baseUrl: "https://notreal.example.com" },
        state,
      ) as { reachable: boolean; looksLikeProvider: boolean };

      expect(result.reachable).toBe(true);
      expect(result.looksLikeProvider).toBe(false);
    });

    it("includes gitlab version string for gitlab provider with a valid URL", () => {
      const state = makeState();
      const result = remoteStub(
        "ping_provider",
        { provider: "gitlab", baseUrl: "https://gitlab.acme-labs.internal/api/v4" },
        state,
      ) as { version: string | null };

      expect(result.version).toBe("17.2.0-ee");
    });

    it("does not set gitlab version for github provider", () => {
      const state = makeState();
      const result = remoteStub(
        "ping_provider",
        { provider: "github", baseUrl: "https://github.com" },
        state,
      ) as { version: string | null };

      expect(result.version).toBeNull();
    });
  });

  // ─── verify_credentials ──────────────────────────────────────────────────────

  describe("verify_credentials", () => {
    it("returns login object on success (valid token, no bogus baseUrl)", () => {
      const state = makeState();
      const result = remoteStub(
        "verify_credentials",
        { token: "valid-token-xyz", provider: "github" },
        state,
      ) as { login: string };

      expect(typeof result.login).toBe("string");
      expect(result.login.length).toBeGreaterThan(0);
    });

    it("echoes the provided username in the login field", () => {
      const state = makeState();
      const result = remoteStub(
        "verify_credentials",
        { token: "valid-token", provider: "github", username: "alice" },
        state,
      ) as { login: string };

      expect(result.login).toBe("alice");
    });

    it("falls back to '<provider>-demo-user' when username is omitted", () => {
      const state = makeState();
      const result = remoteStub(
        "verify_credentials",
        { token: "valid-token", provider: "gitlab" },
        state,
      ) as { login: string };

      expect(result.login).toBe("gitlab-demo-user");
    });

    it("throws unauthorized for token '1234'", () => {
      const state = makeState();
      expect(() =>
        remoteStub("verify_credentials", { token: "1234", provider: "github" }, state),
      ).toThrow();
      try {
        remoteStub("verify_credentials", { token: "1234", provider: "github" }, state);
      } catch (e) {
        expect((e as { kind: string }).kind).toBe("unauthorized");
      }
    });

    it("throws unauthorized for an empty token", () => {
      const state = makeState();
      expect(() =>
        remoteStub("verify_credentials", { token: "", provider: "github" }, state),
      ).toThrow();
      try {
        remoteStub("verify_credentials", { token: "", provider: "github" }, state);
      } catch (e) {
        expect((e as { kind: string }).kind).toBe("unauthorized");
      }
    });

    it("throws unauthorized for a whitespace-only token", () => {
      const state = makeState();
      expect(() =>
        remoteStub("verify_credentials", { token: "   ", provider: "github" }, state),
      ).toThrow();
    });

    it("throws not-provider-response when baseUrl doesn't look like the provider", () => {
      const state = makeState();
      expect(() =>
        remoteStub(
          "verify_credentials",
          { token: "good-token", provider: "github", baseUrl: "https://some-random-host.invalid" },
          state,
        ),
      ).toThrow();
      try {
        remoteStub(
          "verify_credentials",
          { token: "good-token", provider: "github", baseUrl: "https://some-random-host.invalid" },
          state,
        );
      } catch (e) {
        expect((e as { kind: string }).kind).toBe("not-provider-response");
      }
    });

    it("succeeds when baseUrl is null (no self-hosted URL provided)", () => {
      const state = makeState();
      const result = remoteStub(
        "verify_credentials",
        { token: "good-token", provider: "github", baseUrl: null },
        state,
      ) as { login: string };
      expect(typeof result.login).toBe("string");
    });

    it("succeeds when baseUrl is a recognized provider host", () => {
      const state = makeState();
      const result = remoteStub(
        "verify_credentials",
        { token: "good-token", provider: "github", baseUrl: "https://api.github.com" },
        state,
      ) as { login: string };
      expect(typeof result.login).toBe("string");
    });
  });

  // ─── fetch_pull_requests ─────────────────────────────────────────────────────

  describe("fetch_pull_requests", () => {
    it("returns PRs for a repo that has them", () => {
      const state = makeState();
      const result = remoteStub(
        "fetch_pull_requests",
        { repoId: "repo-recrest" },
        state,
      ) as unknown[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns empty array for a repo with no PRs", () => {
      const state = makeState();
      const result = remoteStub("fetch_pull_requests", { repoId: "repo-octo-notes" }, state);
      expect(result).toEqual([]);
    });

    it("returns empty array when repoId is not in the seed at all", () => {
      const state = makeState();
      const result = remoteStub("fetch_pull_requests", { repoId: "no-such-repo" }, state);
      expect(result).toEqual([]);
    });

    it("returns empty array when repoId is omitted", () => {
      const state = makeState();
      const result = remoteStub("fetch_pull_requests", {}, state);
      expect(result).toEqual([]);
    });
  });
});
