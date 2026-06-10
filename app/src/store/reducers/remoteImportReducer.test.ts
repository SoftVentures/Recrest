import type { Organization, RemoteRepository, RemoteRepositoryList } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  clearCloneProgress,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
  setCloneProgress,
} from "@/store/actions/remoteImport.actions";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { type RemoteImportState, keyFor } from "@/store/types/remoteImport.types";

const initial = (): RemoteImportState => remoteImportReducer(undefined, { type: "@@INIT" });

function remoteRepo(id: string): RemoteRepository {
  return {
    providerId: "github",
    id,
    fullName: `octocat/${id}`,
    name: id,
    description: null,
    defaultBranch: "main",
    isPrivate: false,
    isFork: false,
    isArchived: false,
    cloneUrlHttps: `https://github.com/octocat/${id}.git`,
    cloneUrlSsh: null,
    htmlUrl: `https://github.com/octocat/${id}`,
    updatedAt: null,
    pushedAt: null,
    sizeKb: null,
    language: null,
    ownerLogin: "octocat",
    ownerAvatarUrl: null,
  };
}

function org(id: string): Organization {
  return {
    providerId: "github",
    id,
    slug: id,
    displayName: id,
    avatarUrl: null,
  };
}

describe("remoteImportReducer", () => {
  it("clears clone progress", () => {
    const seeded = remoteImportReducer(
      initial(),
      setCloneProgress({ remoteRepoId: "x", stage: "cloning" }),
    );
    const next = remoteImportReducer(seeded, clearCloneProgress());
    expect(next.cloneProgress).toEqual({});
  });

  it("sets clone progress keyed by remote repo id", () => {
    const next = remoteImportReducer(
      initial(),
      setCloneProgress({ remoteRepoId: "x", stage: "error", error: "boom" }),
    );
    expect(next.cloneProgress["x"]).toEqual({ stage: "error", error: "boom" });
  });

  it("sets per-key loading on fetchRemoteRepositories.pending", () => {
    const arg = { providerId: "github" as const, orgSlug: "acme" };
    const next = remoteImportReducer(
      initial(),
      fetchRemoteRepositories.pending("internal-id", arg),
    );
    expect(next.loading[keyFor("github", "acme")]).toBe(true);
    expect(next.error).toBeNull();
  });

  it("caches the listing on fetchRemoteRepositories.fulfilled", () => {
    const arg = { providerId: "github" as const, orgSlug: "acme" };
    const key = keyFor("github", "acme");
    const value: RemoteRepositoryList = {
      repositories: [remoteRepo("repo-a")],
      localMatches: { "repo-a": "local-1" },
    };
    const next = remoteImportReducer(
      initial(),
      fetchRemoteRepositories.fulfilled({ key, value }, "internal-id", arg),
    );
    expect(next.listings[key]?.repositories.map((r) => r.id)).toEqual(["repo-a"]);
    expect(next.listings[key]?.localMatches).toEqual({ "repo-a": "local-1" });
    expect(typeof next.listings[key]?.loadedAt).toBe("number");
    expect(next.loading[key]).toBe(false);
  });

  it("records the error and clears loading on fetchRemoteRepositories.rejected", () => {
    const arg = { providerId: "github" as const, orgSlug: null };
    const key = keyFor("github", null);
    const next = remoteImportReducer(
      initial(),
      fetchRemoteRepositories.rejected(new Error("list boom"), "internal-id", arg),
    );
    expect(next.error).toBe("list boom");
    expect(next.loading[key]).toBe(false);
  });

  it("stores organizations per provider on fetchRemoteOrganizations.fulfilled", () => {
    const next = remoteImportReducer(
      initial(),
      fetchRemoteOrganizations.fulfilled(
        { providerId: "github", orgs: [org("acme")] },
        "internal-id",
        "github",
      ),
    );
    expect(next.organizations["github"]?.map((o) => o.id)).toEqual(["acme"]);
  });
});
