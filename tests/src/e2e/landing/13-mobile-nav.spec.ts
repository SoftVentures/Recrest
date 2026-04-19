import { expect, test } from "../../fixtures/landing.fixture.js";

/**
 * Mobile nav drawer — driven by `device-type-detection`. These assertions
 * only make sense on the `landing-mobile` project; skip everywhere else.
 */
const skipIfNotMobile = (projectName: string) =>
  test.skip(projectName !== "landing-mobile", "mobile drawer only rendered on mobile device class");

test.describe("landing / mobile nav drawer", () => {
  test("toggle button swaps aria-expanded + reveals drawer", async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /open menu/i });
    const drawer = page.locator(".nav-drawer");

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(drawer).toHaveAttribute("hidden", "");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(drawer).not.toHaveAttribute("hidden", "");
    await expect(drawer).toHaveClass(/open/);
    await expect(drawer.getByRole("link", { name: /overview/i })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /privacy/i })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /contribute/i })).toBeVisible();
  });

  test("Escape closes the drawer", async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /open menu/i });
    await toggle.click();
    await expect(page.locator(".nav-drawer")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".nav-drawer")).not.toHaveClass(/open/);
  });

  test("clicking a drawer link closes the drawer", async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name);
    await page.goto("/");
    await page.getByRole("button", { name: /open menu/i }).click();
    const drawer = page.locator(".nav-drawer");
    await expect(drawer).toHaveClass(/open/);
    await drawer.getByRole("link", { name: /contribute/i }).click();
    await expect(drawer).not.toHaveClass(/open/);
    await expect(page).toHaveURL(/#contribute$/);
  });

  test("aria-controls references the drawer element", async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /open menu/i });
    const controlsId = await toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    await expect(page.locator(`#${controlsId}`)).toHaveClass(/nav-drawer/);
  });
});
