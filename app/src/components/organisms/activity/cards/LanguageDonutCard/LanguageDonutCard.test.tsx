import { describe, expect, it } from "vitest";

import LanguageDonutCard from "@/components/organisms/activity/cards/LanguageDonutCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("LanguageDonutCard", () => {
  it("renders the language card root", () => {
    const { getByTestId } = renderWithProviders(<LanguageDonutCard mix={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.language)).toBeInTheDocument();
  });
});
