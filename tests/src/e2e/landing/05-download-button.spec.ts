import { expect, test } from "../../fixtures/landing.fixture.js";
import { expectedDownloadUrl } from "../../helpers/constants.js";

const CASES = [
  {
    name: "macOS",
    os: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605 Safari/605",
    labelPattern: /Download for macOS/i,
  },
  {
    name: "Windows",
    os: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537",
    labelPattern: /Download for Windows/i,
  },
  {
    name: "Linux",
    os: "linux",
    ua: "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537",
    labelPattern: /Download for Linux/i,
  },
  {
    name: "unknown",
    os: "unknown",
    ua: "Mozilla/5.0 (PlayStation 5) AppleWebKit/605",
    labelPattern: /Download latest release/i,
  },
] as const;

for (const os of CASES) {
  test.describe(`landing / download button — ${os.name}`, () => {
    test.use({ fakeUserAgent: os.ua });
    test("label + link match the OS branch", async ({ page }) => {
      await page.goto("/");
      const cta = page.locator(".hero-cta a.btn.btn-primary").first();
      await expect(cta).toBeVisible();
      await expect(cta).toHaveText(os.labelPattern);
      await expect(cta).toHaveAttribute("href", expectedDownloadUrl(os.os));
      await expect(cta).toHaveAttribute("target", "_blank");
      await expect(cta).toHaveAttribute("rel", /noreferrer/);
    });
  });
}
