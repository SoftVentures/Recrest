import { describe, expect, it } from "vitest";

import TimeToMergeCard from "@/components/organisms/activity/cards/TimeToMergeCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("TimeToMergeCard", () => {
  it("renders the time-to-merge card root", () => {
    const { getByTestId } = renderWithProviders(
      <TimeToMergeCard
        buckets={[
          { bucket: "<1h", count: 0 },
          { bucket: "<1d", count: 0 },
          { bucket: "<3d", count: 0 },
          { bucket: ">=3d", count: 0 },
        ]}
      />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.timeToMerge)).toBeInTheDocument();
  });
});
