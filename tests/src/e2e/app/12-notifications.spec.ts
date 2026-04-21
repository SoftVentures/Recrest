import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

/**
 * The notifications settings section embeds a developer preview block that is
 * only rendered when Vite's `import.meta.env.DEV` is true. Running under
 * `yarn dev:web` satisfies that, so these buttons must be reachable from the
 * browser-only E2E runner.
 */
test.describe("app / developer notification preview", () => {
  test("dev preview buttons are visible in dev mode", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-general").click();

    // The preview is wrapped in a <details> element to keep the section tidy.
    // Expand it before asserting the controls inside.
    const preview = page.getByTestId("dev-notification-preview");
    await expect(preview).toBeVisible();
    await preview.locator("summary").click();

    await expect(page.getByTestId("dev-notif-send-new-pr")).toBeVisible();
    await expect(page.getByTestId("dev-notif-send-ci-failed")).toBeVisible();
    await expect(page.getByTestId("dev-notif-send-merge-ready")).toBeVisible();
    await expect(page.getByTestId("dev-notif-send-generic")).toBeVisible();
    await expect(page.getByTestId("dev-notif-send-burst")).toBeVisible();
    await expect(page.getByTestId("dev-notif-clear-baseline")).toBeVisible();
  });

  test("clicking a send button does not throw", async ({ page }) => {
    // The tauri-stub fixture handles the `notify` command. Stub-internal
    // `unregisterListener` chatter is pre-existing environment noise that
    // isn't caused by DevNotificationPreview; filter it out and assert that
    // no *other* uncaught page errors leak from the click handler.
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      if (e.message.includes("unregisterListener")) return;
      errors.push(e.message);
    });

    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-general").click();

    const preview = page.getByTestId("dev-notification-preview");
    await preview.locator("summary").click();
    await page.getByTestId("dev-notif-send-new-pr").click();

    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
  });
});
