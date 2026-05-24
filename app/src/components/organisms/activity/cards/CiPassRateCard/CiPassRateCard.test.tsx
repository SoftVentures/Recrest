import { describe, expect, it } from "vitest";

import CiPassRateCard from "@/components/organisms/activity/cards/CiPassRateCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("CiPassRateCard", () => {
  it("renders the CI pass-rate card root", () => {
    const { getByTestId } = renderWithProviders(<CiPassRateCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.ciPassRate)).toBeInTheDocument();
  });
});
