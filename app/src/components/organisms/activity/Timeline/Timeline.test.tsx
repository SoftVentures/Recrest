import { describe, expect, it } from "vitest";

import Timeline from "@/components/organisms/activity/Timeline";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("Timeline", () => {
  it("renders the timeline card root", () => {
    const today = new Date("2025-02-15T12:00:00Z");
    const { getByTestId } = renderWithProviders(
      <Timeline commits={[]} prEvents={[]} checkRuns={[]} today={today} reposById={new Map()} />,
    );
    expect(getByTestId(TEST_IDS.activity.timeline.card)).toBeInTheDocument();
  });
});
