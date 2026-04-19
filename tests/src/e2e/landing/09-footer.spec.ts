import { expect, test } from "../../fixtures/landing.fixture.js";
import { EXPECTED_APP_VERSION, REPO_URL } from "../../helpers/constants.js";

test.describe("landing / footer", () => {
  test("copyright includes © + year + version", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    const bottom = footer.locator(".footer-bottom").first();
    await bottom.scrollIntoViewIfNeeded();
    await expect(bottom).toBeVisible();
    await expect(bottom).toContainText("©");
    const year = new Date().getFullYear();
    await expect(bottom).toContainText(String(year));
    await expect(bottom).toContainText(`v${EXPECTED_APP_VERSION}`);
  });

  test("all three columns + repo-anchored links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    const cols = footer.locator(".footer-col");
    await expect(cols).toHaveCount(3);

    const githubLink = footer.getByRole("link", { name: /GitHub/i }).first();
    await expect(githubLink).toHaveAttribute("href", REPO_URL);

    const rss = footer.getByRole("link", { name: /Release feed/i });
    await expect(rss).toHaveAttribute("href", `${REPO_URL}/releases.atom`);
  });

  test("language switcher is rendered in the footer bottom row", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator(".lang-switcher")).toBeVisible();
  });
});
