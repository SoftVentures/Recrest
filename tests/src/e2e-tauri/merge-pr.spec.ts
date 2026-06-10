import { expect } from "expect-webdriverio";

import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";

/// Plan-8 E.4.9 — end-to-end coverage for Plan 7 (provider-side merge).
/// One scenario per Plan-07 done-check item plus the failure modes the
/// Plan-07 code review locked in.

describe("Plan 7 — Provider-side merge", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("merges a GitHub PR with squash + branch delete; row flips to merged", async () => {
    e2e = await startRecrestE2E();
    await seedGithubRepoInProfile(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.openMr(1);
    await e2e.page.openMergeModal();
    await e2e.page.pickStrategy("squash");
    await e2e.page.toggleDeleteSourceBranch(true);
    await e2e.page.confirmMerge();

    await e2e.page.expectSuccessToast();
    await e2e.page.expectMergedRowGone(1);

    const ghReqs = e2e.mocks.state.requests.github;
    const mergeCall = ghReqs.find((r) => r.method === "PUT" && r.path.endsWith("/pulls/1/merge"));
    expect(mergeCall).toBeDefined();
    expect((mergeCall!.body as { merge_method?: string }).merge_method).toBe("squash");

    const deleteCall = ghReqs.find(
      (r) => r.method === "DELETE" && r.path.includes("/git/refs/heads/"),
    );
    expect(deleteCall).toBeDefined();
  });

  it("disables Rebase for a Bitbucket repo (no rebase-on-merge endpoint)", async () => {
    e2e = await startRecrestE2E();
    await seedBitbucketRepoInProfile(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-bitbucket-repo");
    await e2e.page.openMr(1);
    await e2e.page.openMergeModal();

    expect(await e2e.page.strategyIsDisabled("rebase")).toBe(true);
    expect(await e2e.page.strategyIsDisabled("merge")).toBe(false);
    expect(await e2e.page.strategyIsDisabled("squash")).toBe(false);
  });

  it("reports branch retention when GitLab branch is protected", async () => {
    e2e = await startRecrestE2E({ scenario: "gitlab_protected_branch" });
    await seedGitlabRepoInProfile(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");
    await e2e.page.openMr(1);
    await e2e.page.openMergeModal();
    await e2e.page.pickStrategy("merge");
    await e2e.page.toggleDeleteSourceBranch(true);
    await e2e.page.confirmMerge();

    // Merge succeeds but the branch survives — the Plan-7 GitLab impl
    // honors this via a follow-up GET on the branch ref. The result is
    // surfaced via the toast lifecycle (warning for partial success).
    await e2e.page.expectSuccessToast();

    // Mock-side: the merge request was honored but the branch endpoint
    // still reports the branch as existing.
    expect(e2e.mocks.state.deletedBranches.gitlab.has("feature-x")).toBe(false);
    expect(e2e.mocks.state.mergedPrs.gitlab.has(1)).toBe(true);
  });

  it("surfaces an error toast when GitLab rebase stalls", async () => {
    e2e = await startRecrestE2E({ scenario: "gitlab_rebase_stuck" });
    await seedGitlabRepoInProfile(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");
    await e2e.page.openMr(1);
    await e2e.page.openMergeModal();
    await e2e.page.pickStrategy("rebase");
    await e2e.page.confirmMerge();

    await e2e.page.expectErrorToast();
    expect(e2e.mocks.state.mergedPrs.gitlab.has(1)).toBe(false);
  });

  it("surfaces an error toast on GitHub merge conflict (405)", async () => {
    e2e = await startRecrestE2E({ scenario: "github_pr_merge_conflict" });
    await seedGithubRepoInProfile(e2e.profileId);
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.openMr(1);
    await e2e.page.openMergeModal();
    await e2e.page.pickStrategy("merge");
    await e2e.page.confirmMerge();

    await e2e.page.expectErrorToast();
    expect(e2e.mocks.state.mergedPrs.github.has(1)).toBe(false);
  });
});

async function seedGithubRepoInProfile(profileId: string): Promise<void> {
  return seedSettings(
    profileId,
    repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
  );
}

async function seedGitlabRepoInProfile(profileId: string): Promise<void> {
  return seedSettings(
    profileId,
    repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
  );
}

async function seedBitbucketRepoInProfile(profileId: string): Promise<void> {
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
