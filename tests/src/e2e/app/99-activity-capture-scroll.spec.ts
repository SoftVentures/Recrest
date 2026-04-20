import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

test("scroll capture", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "app-desktop") return;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(AppRoute.ACTIVITY);
  await page.waitForTimeout(2800);

  const scroller = page.locator(".a-content-scroll");
  const total = await scroller.evaluate((el) => el.scrollHeight);
  let y = 0;
  let i = 0;
  while (y < total && i < 12) {
    await scroller.evaluate(
      (el, yy) => el.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }),
      y,
    );
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `../.screenshots/activity/scroll-${String(i).padStart(2, "0")}.png`,
      fullPage: false,
    });
    y += 800;
    i += 1;
  }
  expect(true).toBe(true);
});
