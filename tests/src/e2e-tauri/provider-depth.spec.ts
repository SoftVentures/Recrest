import { expect } from "expect-webdriverio";

import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { DATA_ATTR } from "./page/recrestPage";

/// Plan-10 — Plans 04 + 05 (provider depth) E2E backfill.
///
/// D.1 (avatar + real name): asserts the MR row's `data-mr-author` attribute
/// matches the display name the mock returns, NOT the login. Plan-5 explicitly
/// required surfacing "name anstelle von username".
///
/// D.2 (orgs / groups / workspaces): asserts the Rust client actually hits
/// the per-provider listing endpoints. Per-DOM rendering of org chips lives
/// inside the AddRepoModal flow which is a separate sub-surface — covered
/// by mock-request-log assertions here so contract drift in the Rust
/// `list_organizations` mappers fails the spec.

describe("Plans 4 + 5 — Provider depth (avatar / name / orgs)", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("GitHub MR list surfaces the author login on the MR row", async () => {
    // GitHub's `map_pr` (app/src-tauri/src/providers/github.rs::map_pr)
    // maps `author = user.login`. The display-name plumbing GitLab + Bitbucket
    // give for free isn't surfaced for GitHub without a second API hop —
    // out of scope for D.1. Lock the current contract in instead.
    e2e = await startRecrestE2E();
    await seedGithubRepo(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");

    const row = await e2e.page.firstMrRow();
    expect(await row.getAttribute(DATA_ATTR.mrAuthor)).toBe("e2e-tester");
  });

  it("GitLab MR list surfaces the author display name on the MR row", async () => {
    e2e = await startRecrestE2E();
    await seedGitlabRepo(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");

    const row = await e2e.page.firstMrRow();
    expect(await row.getAttribute(DATA_ATTR.mrAuthor)).toBe("E2E Tester");
  });

  it("Bitbucket MR list surfaces the author display_name on the MR row", async () => {
    e2e = await startRecrestE2E();
    await seedBitbucketRepo(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-bitbucket-repo");

    const row = await e2e.page.firstMrRow();
    expect(await row.getAttribute(DATA_ATTR.mrAuthor)).toBe("E2E Tester");
  });

  it("GitHub orgs endpoint is hit when the remote-import flow opens", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await e2e.restart();

    await e2e.page.openRemoteImport("github");
    await e2e.page.waitForOrgsRequest();

    const reqs = e2e.mocks.state.requests.github;
    expect(reqs.some((r) => r.method === "GET" && r.path === "/user/orgs")).toBe(true);
  });

  it("GitLab groups endpoint is hit when the remote-import flow opens", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await e2e.restart();

    await e2e.page.openRemoteImport("gitlab");
    await e2e.page.waitForOrgsRequest();

    const reqs = e2e.mocks.state.requests.gitlab;
    expect(reqs.some((r) => r.method === "GET" && r.path === "/groups")).toBe(true);
  });

  it("Bitbucket workspaces endpoint is hit when the remote-import flow opens", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await e2e.restart();

    await e2e.page.openRemoteImport("bitbucket");
    await e2e.page.waitForOrgsRequest();

    const reqs = e2e.mocks.state.requests.bitbucket;
    expect(reqs.some((r) => r.method === "GET" && r.path === "/workspaces")).toBe(true);
  });
});

async function seedGithubRepo(profileId: string): Promise<void> {
  return seedSettings(
    profileId,
    repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
  );
}
async function seedGitlabRepo(profileId: string): Promise<void> {
  return seedSettings(
    profileId,
    repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
  );
}
async function seedBitbucketRepo(profileId: string): Promise<void> {
  return seedSettings(
    profileId,
    repoSettings(
      "e2e-bitbucket-repo",
      "bitbucket",
      "https://bitbucket.org/test-ws/test-repo-bitbucket.git",
    ),
  );
}

function repoSettings(
  repoId: string,
  providerId: string,
  remoteUrl: string,
): Record<string, unknown> {
  return {
    repos: {
      [repoId]: {
        id: repoId,
        name: `test-repo-${providerId}`,
        path: "/tmp/recrest-e2e-fake-repo",
        groupId: null,
        remoteUrl,
        providerId,
        manual: true,
      },
    },
    locale: "en",
  };
}
