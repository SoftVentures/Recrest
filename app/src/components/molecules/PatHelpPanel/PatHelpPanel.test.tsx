import { PROVIDER_PAT_INFO } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import PatHelpPanel from "@/components/molecules/PatHelpPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import * as tauri from "@/lib/tauri";
import i18n from "@/locales";
import commonEn from "@/locales/en/common.json";
import { renderWithProviders } from "@/test/utils";

describe("PatHelpPanel", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves GitHub scope labels whose id contains i18next's namespace separator", () => {
    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="github" />);

    for (const scope of PROVIDER_PAT_INFO.github.requiredScopes) {
      const node = getByTestId(TEST_IDS.onboarding.patHelpScope(scope));
      const expected = commonEn.pat.scope_label.github[scope];
      expect(node.textContent).toBe(expected);
      // The `defaultValue` fallback would render the bare scope id.
      expect(node.textContent).not.toBe(scope);
    }
  });

  it("resolves Bitbucket scope labels (every id carries a colon)", () => {
    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="bitbucket" />);

    for (const scope of PROVIDER_PAT_INFO.bitbucket.requiredScopes) {
      const node = getByTestId(TEST_IDS.onboarding.patHelpScope(scope));
      const expected = commonEn.pat.scope_label.bitbucket[scope];
      expect(node.textContent).toBe(expected);
      expect(node.textContent).not.toBe(scope);
    }
  });

  it("resolves GitLab scope labels (no separator in the ids)", () => {
    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="gitlab" />);

    for (const scope of PROVIDER_PAT_INFO.gitlab.requiredScopes) {
      const node = getByTestId(TEST_IDS.onboarding.patHelpScope(scope));
      expect(node.textContent).toBe(commonEn.pat.scope_label.gitlab[scope]);
    }
  });
});

/** The two buttons are the whole point of the panel — a user who cannot reach
 *  the token page cannot connect an account at all. */
describe("PatHelpPanel external links", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const openSpy = () => vi.spyOn(tauri, "openExternal").mockResolvedValue(undefined);

  it("opens the provider docs when read-docs is clicked", () => {
    const open = openSpy();
    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="github" />);

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpDocs));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]?.[0]).toBe(PROVIDER_PAT_INFO.github.docsUrl);
  });

  it("opens the GitHub token page with every required scope prefilled", () => {
    const open = openSpy();
    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="github" />);

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));

    const url = open.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("scopes=repo,read:user,read:org");
    expect(url).toContain("description=Recrest");
  });

  it("substitutes a self-hosted GitLab base URL into the token page link", () => {
    const open = openSpy();
    const { getByTestId } = renderWithProviders(
      <PatHelpPanel provider="gitlab" baseUrl="https://gitlab.acme.test/api/v4" />,
    );

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));

    const url = open.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("https://gitlab.acme.test/-/user_settings/personal_access_tokens");
    expect(url).not.toContain("/api/v4");
  });
});
