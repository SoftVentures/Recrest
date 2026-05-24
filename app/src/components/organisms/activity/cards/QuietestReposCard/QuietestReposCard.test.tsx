import { describe, expect, it } from "vitest";

import QuietestReposCard from "@/components/organisms/activity/cards/QuietestReposCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("QuietestReposCard", () => {
  it("renders the quietest-repos card root", () => {
    const { getByTestId } = renderWithProviders(
      <QuietestReposCard quietestRepoIds={[]} reposById={new Map()} />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.quietestRepos)).toBeInTheDocument();
  });
});
