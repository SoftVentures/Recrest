import { expect, test } from "../../fixtures/landing.fixture.js";

test.describe("landing / privacy section", () => {
  test("eyebrow, title, body + 3 stats + 4 property cards render", async ({ page }) => {
    await page.goto("/#privacy");
    const section = page.locator("#privacy");
    await expect(section).toBeVisible();

    await expect(section.locator(".section-eyebrow")).toBeVisible();
    await expect(section.locator("h2")).toBeVisible();

    const stats = section.locator(".privacy-stat");
    await expect(stats).toHaveCount(3);

    const cards = section.locator(".privacy-card");
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i).locator("strong")).toBeVisible();
    }
  });

  test("DataFlow visual is present", async ({ page }) => {
    await page.goto("/#privacy");
    const flow = page.locator("#privacy .privacy-flow, #privacy svg");
    await expect(flow.first()).toBeVisible();
  });

  test.describe("with reduced motion", () => {
    test("no > 16 ms animations past prefers-reduced-motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/#privacy");
      // The site ships the "approximately zero duration" variant of the a11y
      // rule (animation-duration: 0.01ms !important). Anything above a single
      // frame (~16 ms) would still visibly animate.
      const longAnimations = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("*"))
          .filter((el) => {
            const s = getComputedStyle(el);
            return (
              s.animationName !== "none" &&
              parseFloat(s.animationDuration || "0") > 0.016 &&
              parseFloat(s.animationIterationCount || "0") !== 1
            );
          })
          .map((el) => ({
            cls: (el as HTMLElement).className,
            dur: getComputedStyle(el).animationDuration,
          }));
      });
      expect(longAnimations, JSON.stringify(longAnimations)).toEqual([]);
    });
  });
});
