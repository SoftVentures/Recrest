import { expect, test } from "../../fixtures/landing.fixture.js";

test.describe("landing / hero demo", () => {
  test("row click selects the repo and updates the detail pane", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator(".demo-trow");
    await expect(rows.first()).toBeVisible();

    const totalRows = await rows.count();
    expect(totalRows).toBeGreaterThan(2);

    // Default selection — exactly one .active row at load.
    await expect(page.locator(".demo-trow.active")).toHaveCount(1);

    // Click the second row, confirm selection moved.
    const secondRow = rows.nth(1);
    const secondName = await secondRow.locator(".demo-repo-name").innerText();
    await secondRow.click();
    await expect(secondRow).toHaveClass(/active/);
    await expect(page.locator(".demo-trow.active")).toHaveCount(1);

    // Detail pane shows the selected repo's name (trim to ignore decoration).
    const detail = page.locator(".demo-detail, .demo-detail-pane");
    if (await detail.count()) {
      await expect(detail).toContainText(secondName.trim());
    }
  });

  test("hover on a row does not cause height-jump in the demo frame", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".screenshot-frame.demo-frame");
    await expect(frame).toBeVisible();
    // Settle parallax / initial animations before measuring.
    await frame.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    const initialHeight = await frame.evaluate((el) => el.getBoundingClientRect().height);

    // Hover a non-active row.
    const rows = page.locator(".demo-trow");
    await rows.nth(2).hover();
    await page.waitForTimeout(250);
    const hoverHeight = await frame.evaluate((el) => el.getBoundingClientRect().height);

    // 4 px tolerance for sub-pixel + parallax jitter. The original bug was a
    // 24 px jump from a hover rule that has since been removed; 4 px is still
    // catch-any-real-regression territory but forgiving of the CSS parallax
    // transform that shifts the frame a few pixels on mouse move.
    expect(
      Math.abs(hoverHeight - initialHeight),
      `frame height jumped ${hoverHeight - initialHeight}px on hover`,
    ).toBeLessThanOrEqual(4);
  });

  test("group chevron collapses that group's rows", async ({ page }) => {
    await page.goto("/");
    const groups = page.locator(".demo-group-row, .demo-group-head");
    if (!(await groups.count())) test.skip(true, "demo has no group headers");
    const firstGroupToggle = groups.first();
    const rowsBefore = await page.locator(".demo-trow").count();
    await firstGroupToggle.click();
    await page.waitForTimeout(200);
    const rowsAfter = await page.locator(".demo-trow").count();
    expect(rowsAfter).toBeLessThan(rowsBefore);
  });
});
