import { expect, test } from "../../fixtures/landing.fixture.js";
import { REPO_URL } from "../../helpers/constants.js";
import { LANDING_COPY } from "../../helpers/selectors.js";

test.describe("landing / nav", () => {
  test("brand + three nav links + GitHub + download visible", async ({ page }, testInfo) => {
    await page.goto("/");
    const nav = page.locator("nav.nav");
    await expect(nav).toBeVisible();

    const brand = nav.locator(".brand").first();
    await expect(brand).toContainText("Recrest");

    const isMobile = testInfo.project.name === "landing-mobile";
    if (isMobile) {
      // device-type-detection collapses the inline links into a drawer toggle.
      await expect(nav.locator(".nav-links")).toHaveCount(0);
      await expect(nav.getByRole("button", { name: /open menu/i })).toBeVisible();
    } else {
      await expect(nav.locator(".nav-links a")).toHaveCount(3);
      const githubLink = nav
        .locator(".nav-right a")
        .filter({ hasText: LANDING_COPY.en.nav.github });
      await expect(githubLink).toHaveAttribute("href", REPO_URL);
      await expect(githubLink).toHaveAttribute("target", "_blank");
    }

    // Primary download link stays visible on every viewport.
    const downloadAnchor = nav.locator('.nav-right a[href="#download"]');
    await expect(downloadAnchor).toBeVisible();
  });

  test("scroll past 8px toggles the .scrolled class", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav.nav");
    await expect(nav).not.toHaveClass(/scrolled/);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(nav).toHaveClass(/scrolled/);
  });

  test("clicking nav.contribute scrolls #contribute into view", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "landing-mobile", "nav-links hidden under 720px");
    await page.goto("/");
    const contributeLink = page
      .locator("nav.nav .nav-links a")
      .filter({ hasText: LANDING_COPY.en.nav.contribute });
    await contributeLink.click();
    await expect(page).toHaveURL(/#contribute$/);
    const section = page.locator("#contribute");
    // Wait for smooth-scroll to settle before measuring.
    await expect
      .poll(
        async () =>
          section.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
          }),
        { timeout: 3000 },
      )
      .toBe(true);
  });
});
