import { expect } from "expect-webdriverio";

import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { T } from "./page/recrestPage";

/// Plan-10 — Plan 04 §C.5 (PR diff + inline comments) E2E backfill.
///
/// SKIPPED — the harness can't reach the diff render today. Blockers:
///   1. `mr-diff-file`/`mr-diff-line`/`mr-diff-comment-btn`/`mr-diff-composer*`
///      are rendered by `DiffView` (`app/src/components/molecules/diff/DiffView/`),
///      which is mounted only by the full `MrDetail` route via `MrDiffCard`.
///      `e2e.page.openMr()` clicks the MR row in `RepoDetail`, which opens
///      `MrDetailDrawer` — the drawer doesn't include `DiffView`. Either
///      route the spec to `AppRoute.MR_DETAIL` (via `mr-detail-open-full`
///      after the drawer mounts) or move the diff into the drawer.
///   2. Even after (1), the Rust client's `get_pull_request_detail` fans
///      out to `/pulls/:n/reviews` + `/issues/:n/timeline` (GitHub) and
///      `/merge_requests/:n/changes` + `/merge_requests/:n/notes` (GitLab)
///      — none of those routes are mocked. Add them in
///      `tests/src/mocks/providers/*.ts` before re-enabling.
/// Track on the Plan-10 follow-up that lands the missing renders.

declare const browser: WebdriverIO.Browser;

describe.skip("Plan 4 — MR diff + inline comments [PENDING DIFF RENDER + DETAIL MOCKS]", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("GitHub: opens MR detail → renders ≥1 diff file row", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.openMr(1);
    await e2e.page.waitForTestId(T.mr.diff.file);

    const files = await e2e.page.byTestIdAll(T.mr.diff.file).getElements();
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("GitLab: opens MR detail → renders ≥1 diff file row", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-gitlab-repo", "gitlab", "https://gitlab.com/test-org/test-repo-gitlab.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-gitlab-repo");
    await e2e.page.openMr(1);
    await e2e.page.waitForTestId(T.mr.diff.file);

    const files = await e2e.page.byTestIdAll(T.mr.diff.file).getElements();
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("Bitbucket: unified-diff text splits into ≥1 file row", async () => {
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
    await e2e.page.openMr(1);
    await e2e.page.waitForTestId(T.mr.diff.file);

    const files = await e2e.page.byTestIdAll(T.mr.diff.file).getElements();
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("GitHub: inline comment composer submits to the comments endpoint", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(
      e2e.profileId,
      repoSettings("e2e-github-repo", "github", "https://github.com/test-org/test-repo-github.git"),
    );
    await e2e.restart();

    await e2e.page.openRepo("e2e-github-repo");
    await e2e.page.openMr(1);
    await e2e.page.waitForTestId(T.mr.diff.file);

    const commentBtn = e2e.page.byTestId(T.mr.diff.commentBtn);
    await commentBtn.waitForClickable({ timeout: 10_000 });
    await commentBtn.click();

    await e2e.page.type(T.mr.diff.composerInput, "looks good");
    await e2e.page.click(T.mr.diff.composerSubmit);

    await browser.waitUntil(
      async () => {
        const reqs = e2e.mocks.state.requests.github;
        return reqs.some((r) => r.method === "POST" && r.path.endsWith("/pulls/1/comments"));
      },
      { timeout: 10_000, timeoutMsg: "no POST to /pulls/1/comments observed" },
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
