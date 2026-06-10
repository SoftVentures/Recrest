import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

test.describe("app / sidebar collapse", () => {
  test("fold button toggles the collapsed state + persists across reload", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByTestId(TEST_IDS.sidebar.root);
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");

    await page.getByTestId(TEST_IDS.sidebar.foldBtn).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");

    // Phase 2 moved sidebar persistence off localStorage onto the backend
    // (settings.windowState via backendSync). Verify it for real: reload and
    // confirm the collapsed state survives the settings round-trip + hydration.
    await page.reload();
    const reloaded = page.getByTestId(TEST_IDS.sidebar.root);
    await expect(reloaded).toBeVisible();
    await expect(reloaded).toHaveAttribute("data-collapsed", "true");
  });
});
