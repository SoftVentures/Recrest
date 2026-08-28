import { expect, test } from "../../fixtures/landing.fixture.js";
import { REPO_URL } from "../../helpers/constants.js";

test.describe("landing / contribute section", () => {
  test("eyebrow, title, body + 2 CTAs + 3 ways visible", async ({ page }) => {
    await page.goto("/#contribute");
    const section = page.locator("#contribute");
    await expect(section).toBeVisible();

    const ctas = section.locator(".hero-cta a");
    await expect(ctas).toHaveCount(2);
    // Primary CTA → repo root, secondary CTA → ROADMAP.md on the default branch
    // (there is no #roadmap section on the landing page to link to).
    await expect(ctas.nth(0)).toHaveAttribute("href", REPO_URL);
    await expect(ctas.nth(1)).toHaveAttribute("href", `${REPO_URL}/blob/main/ROADMAP.md`);

    const ways = section.locator(".contrib-way");
    await expect(ways).toHaveCount(3);

    await expect(ways.nth(0)).toHaveAttribute("href", `${REPO_URL}/issues/new/choose`);
    await expect(ways.nth(1)).toHaveAttribute("href", `${REPO_URL}/pulls`);
    await expect(ways.nth(2)).toHaveAttribute("href", `${REPO_URL}/discussions`);

    for (const way of await ways.all()) {
      await expect(way).toHaveAttribute("target", "_blank");
      await expect(way).toHaveAttribute("rel", /noopener/);
      await expect(way).toHaveAttribute("rel", /noreferrer/);
    }
  });
});
