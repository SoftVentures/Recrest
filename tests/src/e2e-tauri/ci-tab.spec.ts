import { expect } from "expect-webdriverio";

import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { T } from "./page/recrestPage";

/// Plan-10 — Plan 04 §C.4 (CI workflows) E2E backfill.
///
/// SKIPPED — `T.ci.workflow` (`ci-workflow`) is declared in the registry
/// but is **never rendered** by `CiCard` (`app/src/components/organisms/repos/CiCard/index.tsx`).
/// The CI surface shows ONE active workflow at a time with `ci-section`,
/// `ci-runBtn`, `ci-run`, `ci-cancel-run` — not a list of workflow rows.
/// The spec was scoped against a non-existent surface; either land a
/// workflow-row testid (so users can switch workflows) or rewrite this
/// spec around `ci-run` / `ci-runForm` / `ci-cancelRun` only.
///
/// The mock routes + scenarios are correct and the dispatch/cancel flows
/// would work once the spec is refactored — keeping them in the file so
/// the unskip is a refactor, not a rewrite.

declare const browser: WebdriverIO.Browser;

describe.skip("Plan 4 — CI workflows / pipelines [PENDING CI-WORKFLOW RENDER]", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("GitHub: CI tab lists ≥1 workflow", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.ci.section);
    const workflows = await e2e.page.byTestIdAll(T.ci.workflow).getElements();
    expect(workflows.length).toBeGreaterThanOrEqual(1);
  });

  it("GitHub: dispatch renders required input fields when the workflow declares any", async () => {
    e2e = await startRecrestE2E({ scenario: "github_workflow_inputs_required" });
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.ci.workflow);
    await e2e.page.click(T.ci.runBtn);
    await e2e.page.waitForTestId(T.ci.runFormField("environment"));
    await e2e.page.waitForTestId(T.ci.runFormField("version"));
  });

  it("GitHub: dispatch happy path → POST to /dispatches + success toast", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.ci.workflow);
    await e2e.page.click(T.ci.runBtn);
    await e2e.page.click(T.ci.runFormSubmit);

    await browser.waitUntil(
      async () => {
        const reqs = e2e.mocks.state.requests.github;
        return reqs.some((r) => r.method === "POST" && r.path.includes("/dispatches"));
      },
      { timeout: 10_000, timeoutMsg: "no POST to /dispatches observed" },
    );
    await e2e.page.expectSuccessToast();
  });

  it("GitHub: dispatch 404 → error toast surfaces", async () => {
    e2e = await startRecrestE2E({ scenario: "github_workflow_dispatch_404" });
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.ci.workflow);
    await e2e.page.click(T.ci.runBtn);
    await e2e.page.click(T.ci.runFormSubmit);

    await e2e.page.expectErrorToast();
  });

  it("GitLab: pipelines tab lists ≥1 pipeline", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");
    await e2e.page.waitForTestId(T.ci.section);
    const pipelines = await e2e.page.byTestIdAll(T.ci.workflow).getElements();
    expect(pipelines.length).toBeGreaterThanOrEqual(1);
  });

  it("Bitbucket: pipelines tab lists ≥1 pipeline", async () => {
    e2e = await startRecrestE2E();
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
    await e2e.page.waitForTestId(T.ci.section);
    const pipelines = await e2e.page.byTestIdAll(T.ci.workflow).getElements();
    expect(pipelines.length).toBeGreaterThanOrEqual(1);
  });

  it("GitHub: cancel run → POST to cancel endpoint", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.waitForTestId(T.ci.run);
    await e2e.page.click(T.ci.cancelRun);

    await browser.waitUntil(
      async () => {
        const reqs = e2e.mocks.state.requests.github;
        return reqs.some((r) => r.method === "POST" && r.path.endsWith("/cancel"));
      },
      { timeout: 10_000, timeoutMsg: "no POST to cancel observed" },
    );
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
