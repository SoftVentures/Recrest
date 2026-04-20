import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_PRS, SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / merge requests", () => {
  test("lists PR rows from connected-provider repos", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "app-mobile",
      "mobile MR layout hides the list view behind a filter drawer",
    );
    await page.goto(AppRoute.MERGE_REQUESTS);
    await expect(page.getByTestId("merge-requests-page")).toBeVisible();

    // Only the GitHub provider is connected in the default seed — GitLab /
    // Bitbucket-backed repos won't fetch PRs, so their PRs don't show up.
    const githubRepoIds = new Set(
      SEED_REPOS.filter((r) => r.providerId === "github").map((r) => r.id),
    );
    const sampleNumbers = Object.entries(SEED_PRS)
      .filter(([repoId]) => githubRepoIds.has(repoId))
      .flatMap(([, prs]) => prs)
      .filter((p) => p.state === "open" && !p.draft)
      .slice(0, 3)
      .map((p) => p.number);

    for (const n of sampleNumbers) {
      await expect(page.locator(`[data-testid="mr-row"][data-mr-number="${n}"]`)).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
