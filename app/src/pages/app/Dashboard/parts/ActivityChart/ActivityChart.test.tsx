import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import ActivityChart from "@/pages/app/Dashboard/parts/ActivityChart";
import { renderWithProviders } from "@/test/utils";

const AGG = [1, 2, 3, 4];

describe("ActivityChart axis labels", () => {
  it("labels the newest/oldest bars in days for a daily window", () => {
    const { getByTestId } = renderWithProviders(
      <ActivityChart agg={AGG} maxDay={4} unit="day" title="t" meta="m" />,
    );
    const axis = getByTestId(TEST_IDS.dashboard.activityAxis);
    expect(axis.textContent).toContain("today");
    expect(axis.textContent).toContain("days ago");
  });

  it("labels in weeks when the bars are weekly buckets", () => {
    const { getByTestId } = renderWithProviders(
      <ActivityChart agg={AGG} maxDay={4} unit="week" title="t" meta="m" />,
    );
    const axis = getByTestId(TEST_IDS.dashboard.activityAxis);
    expect(axis.textContent).toContain("this week");
    expect(axis.textContent).toContain("weeks ago");
  });

  it("labels in months when the bars are monthly buckets", () => {
    const { getByTestId } = renderWithProviders(
      <ActivityChart agg={AGG} maxDay={4} unit="month" title="t" meta="m" />,
    );
    const axis = getByTestId(TEST_IDS.dashboard.activityAxis);
    expect(axis.textContent).toContain("this month");
    expect(axis.textContent).toContain("months ago");
  });
});
