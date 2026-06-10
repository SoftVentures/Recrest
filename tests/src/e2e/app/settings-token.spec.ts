import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * Settings -> Accounts: connect a provider via personal-access-token. GitLab
 * ships disconnected in the default seed and needs only a token (no username),
 * so it exercises the simplest path. After Save the stub's `set_provider_token`
 * returns a connected ProviderConnection, which the providers reducer writes
 * into state and the row reflects with `StatusPill tone="connected"`.
 */
test.describe("app / settings — connect provider token", () => {
  test("entering a token flips the GitLab row to connected", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("accounts")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("accounts"))).toBeVisible();

    const row = page.getByTestId(TEST_IDS.settings.accounts.providerRow("gitlab"));
    await expect(row).toBeVisible();

    // Starts disconnected ("Not connected").
    await expect(row.getByTestId(TEST_IDS.settings.accounts.statusPill("gitlab"))).toHaveText(
      /not connected/i,
    );

    // Expand the token form, paste a token, save.
    await row.getByTestId(TEST_IDS.settings.accounts.connectButton).click();

    const tokenInput = row.getByTestId(TEST_IDS.settings.accounts.tokenInput);
    await expect(tokenInput).toBeVisible();
    await tokenInput.fill("glpat-e2e-stub-token");

    await row.getByTestId(TEST_IDS.settings.accounts.tokenSave).click();

    // The row now reports connected (exact "Connected", not "Not connected")
    // and the connect button is gone.
    await expect(row.getByTestId(TEST_IDS.settings.accounts.statusPill("gitlab"))).toHaveText(
      "Connected",
    );
    await expect(row.getByTestId(TEST_IDS.settings.accounts.connectButton)).toHaveCount(0);
  });

  test("a pre-connected provider renders the connected pill on load", async ({ page }) => {
    // GitHub is connected in the default seed.
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("accounts")).click();

    const row = page.getByTestId(TEST_IDS.settings.accounts.providerRow("github"));
    await expect(row).toBeVisible();
    await expect(row.getByTestId(TEST_IDS.settings.accounts.statusPill("github"))).toHaveText(
      "Connected",
    );
  });
});
