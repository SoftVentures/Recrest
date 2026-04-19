import { expect, test } from "../../fixtures/landing.fixture.js";
import { EXPECTED_APP_VERSION, RELEASES_LATEST_URL, REPO_URL } from "../../helpers/constants.js";
import { LANDING_COPY } from "../../helpers/selectors.js";

test.describe("landing / hero", () => {
  test("renders EN title, version + both primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1.hero-title")).toContainText(LANDING_COPY.en.hero.titleLine1);
    await expect(page.locator("h1.hero-title")).toContainText(LANDING_COPY.en.hero.titleLine2);

    // Version shows up in eyebrow ("v{version} — ...") + version-hint line.
    const versionTokens = page.getByText(new RegExp(`v${EXPECTED_APP_VERSION}\\b`));
    await expect(versionTokens.first()).toBeVisible();
    expect(await versionTokens.count()).toBeGreaterThanOrEqual(2);

    // Download CTA (primary) inside the hero links to /releases/latest.
    const downloadCta = page.locator(".hero-cta a.btn.btn-primary").first();
    await expect(downloadCta).toBeVisible();
    await expect(downloadCta).toHaveAttribute("href", RELEASES_LATEST_URL);

    // Star on GitHub CTA points at the repo root.
    const starCta = page.getByRole("link", { name: /Star on GitHub/i });
    await expect(starCta).toHaveAttribute("href", REPO_URL);
    await expect(starCta).toHaveAttribute("target", "_blank");
    await expect(starCta).toHaveAttribute("rel", /noreferrer/);
  });

  test.describe("german locale", () => {
    test.use({ uiLocale: "de" });

    test("renders DE title lines", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("h1.hero-title")).toContainText(LANDING_COPY.de.hero.titleLine1);
      await expect(page.locator("h1.hero-title")).toContainText(LANDING_COPY.de.hero.titleLine2);
    });
  });

  test("remote logos: GitHub, GitLab, Bitbucket visible", async ({ page }) => {
    await page.goto("/");
    const remotes = page.locator(".remotes .remote-logo");
    await expect(remotes).toHaveCount(3);
    await expect(remotes.nth(0)).toContainText(/GitHub/);
    await expect(remotes.nth(1)).toContainText(/GitLab/);
    await expect(remotes.nth(2)).toContainText(/Bitbucket/);
  });
});
