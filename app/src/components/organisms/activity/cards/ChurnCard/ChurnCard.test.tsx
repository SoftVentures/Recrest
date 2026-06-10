import { describe, expect, it } from "vitest";

import ChurnCard from "@/components/organisms/activity/cards/ChurnCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ChurnCard", () => {
  it("renders the churn card root", () => {
    const { getByTestId } = renderWithProviders(<ChurnCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.churn)).toBeInTheDocument();
  });
});
