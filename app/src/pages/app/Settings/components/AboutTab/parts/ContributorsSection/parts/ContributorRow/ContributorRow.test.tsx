import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { Contributor } from "@/lib/contributors";
import ContributorRow from "@/pages/app/Settings/components/AboutTab/parts/ContributorsSection/parts/ContributorRow";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const CONTRIBUTOR: Contributor = {
  login: "octocat",
  avatarUrl: "https://example.invalid/a.png",
  profileUrl: "https://example.invalid/octocat",
  contributions: 12345,
  isBot: false,
};

function renderRow(locale: string) {
  const store = makeTestStore({ settings: { locale } });
  return renderWithProviders(
    <ContributorRow
      rank={1}
      contributor={CONTRIBUTOR}
      topContributions={CONTRIBUTOR.contributions}
      onOpen={() => {}}
    />,
    { store },
  );
}

describe("ContributorRow", () => {
  it("groups the commit count with the app locale, not the host locale", () => {
    const { getByTestId } = renderRow("en");
    expect(
      getByTestId(TEST_IDS.settings.about.contributorCommits(CONTRIBUTOR.login)).textContent,
    ).toBe("12,345");
  });

  it("re-groups the commit count when the app language is German", () => {
    const { getByTestId } = renderRow("de");
    expect(
      getByTestId(TEST_IDS.settings.about.contributorCommits(CONTRIBUTOR.login)).textContent,
    ).toBe("12.345");
  });
});
