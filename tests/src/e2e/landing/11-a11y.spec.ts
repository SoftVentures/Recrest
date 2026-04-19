import { scanA11y } from "../../fixtures/a11y.fixture.js";
import { expect, test } from "../../fixtures/landing.fixture.js";

const DISABLED_RULES: string[] = [];

test.describe("landing / a11y", () => {
  for (const section of [
    { id: null, label: "full page" },
    { id: "#privacy", label: "privacy section" },
    { id: "#contribute", label: "contribute section" },
  ] as const) {
    test(`axe-core: no critical/serious violations in ${section.label}`, async ({ page }) => {
      await page.goto(section.id ? `/${section.id}` : "/");
      const result = await scanA11y(page, section.id ?? undefined, DISABLED_RULES);
      if (result.blocking > 0) {
        // Log condensed violation details so the failure artifact is useful.
        console.log(
          `[a11y ${section.label}] blocking=${result.blocking}`,
          JSON.stringify(result.violations, null, 2),
        );
      }
      expect(result.blocking, `critical+serious in ${section.label}`).toBe(0);
    });
  }
});
