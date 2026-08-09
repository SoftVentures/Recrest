import { PROVIDER_PAT_INFO } from "@recrest/shared";

import { beforeAll, describe, expect, it } from "vitest";

import PatHelpPanel from "@/components/molecules/PatHelpPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
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
