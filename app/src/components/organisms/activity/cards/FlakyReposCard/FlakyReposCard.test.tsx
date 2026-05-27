import { describe, expect, it } from "vitest";

import FlakyReposCard from "@/components/organisms/activity/cards/FlakyReposCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("FlakyReposCard", () => {
  it("renders the flaky card root", () => {
    const { getByTestId } = renderWithProviders(<FlakyReposCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.flakyRepos)).toBeInTheDocument();
  });
});
