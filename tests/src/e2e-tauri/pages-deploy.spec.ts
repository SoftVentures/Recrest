import { expect } from "expect-webdriverio";

import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { T } from "./page/recrestPage";

/// Plan-10 — Plan 04 §C.6 (Pages / deploy status) E2E backfill.
/// Mock servers return Pages status by default; failure scenarios drop
/// the endpoint to 404, which should hide the deployments block.

declare const browser: WebdriverIO.Browser;

describe("Plan 4 — Pages / deploy status", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("GitHub Pages live → deployments block renders with a visible link affordance", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.deployments.block);

    // The link affordance is a `<button>` (clicks call `openExternal`) — not
    // an `<a>`, so it has no `href`. Assert visibility, not URL.
    const link = e2e.page.byTestId(T.deployments.link);
    expect(await link.isDisplayed()).toBe(true);
  });

  it("GitHub Pages disabled → deployments block hidden", async () => {
    e2e = await startRecrestE2E({ scenario: "github_pages_disabled" });
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");

    await browser.waitUntil(
      async () => !(await e2e.page.byTestId(T.deployments.block).isExisting()),
      { timeout: 10_000, timeoutMsg: "deployments block still visible despite pagesDisabled" },
    );
  });

  it("GitLab Pages live → deployments block renders", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");
    await e2e.page.waitForTestId(T.deployments.block);
  });

  it("GitLab Pages disabled → deployments block hidden", async () => {
    e2e = await startRecrestE2E({ scenario: "gitlab_pages_disabled" });
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");

    await browser.waitUntil(
      async () => !(await e2e.page.byTestId(T.deployments.block).isExisting()),
      { timeout: 10_000, timeoutMsg: "deployments block still visible despite pagesDisabled" },
    );
  });

  it("Bitbucket: pipelines-yaml fallback surfaces the block", async () => {
    e2e = await startRecrestE2E({ scenario: "bitbucket_pages_via_pipeline" });
    await seedSettings(
      e2e.profileId,
      repoSettings(
        "e2e-bitbucket-repo",
        "bitbucket",
        "https://bitbucket.org/test-ws/test-repo-bitbucket.git",
      ),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-bitbucket-repo");
    await e2e.page.waitForTestId(T.deployments.block);
  });
});

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
