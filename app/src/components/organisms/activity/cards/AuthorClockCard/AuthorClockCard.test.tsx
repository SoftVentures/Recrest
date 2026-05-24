import { describe, expect, it } from "vitest";

import AuthorClockCard from "@/components/organisms/activity/cards/AuthorClockCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("AuthorClockCard", () => {
  it("renders the author-clock card root", () => {
    const { getByTestId } = renderWithProviders(<AuthorClockCard hours={Array(24).fill(0)} />);
    expect(getByTestId(TEST_IDS.activity.cards.authorClock)).toBeInTheDocument();
  });
});
