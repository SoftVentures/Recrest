import { scanA11y } from "../../fixtures/a11y.fixture.js";
import { expect, test } from "../../fixtures/landing.fixture.js";

const ROUTES = [
  {
    hash: "imprint",
    en: { heading: "Imprint", sub: /§ 5 Digital Services Act/ },
    de: { heading: "Impressum", sub: /§ 5 Digitale-Dienste-Gesetz/ },
  },
  {
    hash: "privacy-policy",
    en: { heading: "Privacy policy", sub: /Art\. 13 GDPR/ },
    de: { heading: "Datenschutzerklärung", sub: /Art\. 13 DSGVO/ },
  },
  {
    hash: "accessibility",
    en: { heading: "Accessibility statement", sub: /WCAG 2\.1 AA/ },
    de: { heading: "Erklärung zur Barrierefreiheit", sub: /WCAG 2\.1 AA/ },
  },
] as const;

test.describe("landing / legal — English", () => {
  for (const route of ROUTES) {
    test(`${route.hash} renders with heading + tabs`, async ({ page }) => {
      await page.goto(`/#/legal/${route.hash}`);
      await expect(page.getByRole("heading", { level: 1, name: route.en.heading })).toBeVisible();
      await expect(page.locator(".legal-subtitle")).toContainText(route.en.sub);
      const activeTab = page.locator(".legal-tab.active");
      await expect(activeTab).toHaveCount(1);
      await expect(activeTab).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".legal-tab")).toHaveCount(3);
    });
  }

  test("footer exposes all three legal routes", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("link", { name: "Imprint" })).toHaveAttribute(
      "href",
      "#/legal/imprint",
    );
    await expect(footer.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "#/legal/privacy-policy",
    );
    await expect(footer.getByRole("link", { name: "Accessibility" })).toHaveAttribute(
      "href",
      "#/legal/accessibility",
    );
  });

  test("back-to-home link returns to the landing root", async ({ page }) => {
    await page.goto("/#/legal/imprint");
    const back = page.getByRole("link", { name: /back to homepage/i });
    await expect(back).toHaveAttribute("href", "#");
    await back.click();
    await expect(
      page.getByRole("heading", { level: 1, name: /all your local git repos/i }),
    ).toBeVisible();
  });

  test("imprint loader: test-data .env is rendered", async ({ page }) => {
    await page.goto("/#/legal/imprint");
    const address = page.locator(".legal-address").first();
    await expect(address).toBeVisible();
    // Test values from landingpage/.env — swapped for real secrets in CI deploy.
    await expect(address).toContainText("Recrest Test Deployment");
    await expect(address).toContainText("10115");
    await expect(address).toContainText("Berlin");
  });
});

test.describe("landing / legal — Deutsch", () => {
  test.use({ uiLocale: "de" });

  for (const route of ROUTES) {
    test(`${route.hash} rendert DE-Heading + Subtitle`, async ({ page }) => {
      await page.goto(`/#/legal/${route.hash}`);
      await expect(page.getByRole("heading", { level: 1, name: route.de.heading })).toBeVisible();
      await expect(page.locator(".legal-subtitle")).toContainText(route.de.sub);
    });
  }
});

test.describe("landing / legal — a11y", () => {
  for (const route of ROUTES) {
    test(`axe: no violations on /${route.hash}`, async ({ page }) => {
      await page.goto(`/#/legal/${route.hash}`);
      const result = await scanA11y(page);
      if (result.blocking > 0) {
        console.log(
          `[legal ${route.hash}] blocking=${result.blocking}`,
          JSON.stringify(result.violations, null, 2),
        );
      }
      expect(result.blocking).toBe(0);
    });
  }
});
