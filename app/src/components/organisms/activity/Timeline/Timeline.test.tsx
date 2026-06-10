import type { RecentCommit } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Timeline from "@/components/organisms/activity/Timeline";
import { ACTIVITY_DAYS } from "@/lib/activityStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const TODAY = new Date("2025-02-15T12:00:00Z");

/** Local-noon ISO timestamp `dayOffset` days before TODAY, so it lands in the
 *  intended day bucket regardless of the test runner's timezone. */
function timestampForDay(dayOffset: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - dayOffset);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Build `perDay` commits for each of `days` day-buckets (newest first). */
function buildCommits(days: number, perDay: number): RecentCommit[] {
  const commits: RecentCommit[] = [];
  for (let day = 0; day < days; day += 1) {
    for (let i = 0; i < perDay; i += 1) {
      commits.push({
        sha: `sha-${day}-${i}`,
        summary: `commit ${day}-${i}`,
        author: "Alice",
        authorEmail: "alice@example.com",
        timestamp: timestampForDay(day),
        repoId: "repo-1",
        repoName: "demo",
      });
    }
  }
  return commits;
}

describe("Timeline", () => {
  it("renders the timeline card root", () => {
    const { getByTestId } = renderWithProviders(
      <Timeline commits={[]} prEvents={[]} checkRuns={[]} today={TODAY} reposById={new Map()} />,
    );
    expect(getByTestId(TEST_IDS.activity.timeline.card)).toBeInTheDocument();
  });

  it("caps rendered day-groups and reveals more on click", () => {
    // 13 commits/day across the full window: each day paints 12 rows, so the
    // 150-row cap is reached before all ACTIVITY_DAYS groups render.
    const commits = buildCommits(ACTIVITY_DAYS, 13);
    const { getByTestId, getAllByTestId } = renderWithProviders(
      <Timeline
        commits={commits}
        prEvents={[]}
        checkRuns={[]}
        today={TODAY}
        reposById={new Map()}
      />,
    );

    const initialDays = getAllByTestId(TEST_IDS.activity.timeline.day).length;
    expect(initialDays).toBeLessThan(ACTIVITY_DAYS);

    const showMore = getByTestId(TEST_IDS.activity.timeline.showMore);
    expect(showMore).toBeInTheDocument();

    fireEvent.click(showMore);

    const afterDays = getAllByTestId(TEST_IDS.activity.timeline.day).length;
    expect(afterDays).toBeGreaterThan(initialDays);
  });

  it("renders no show-more button when events fit under the cap", () => {
    const commits = buildCommits(3, 5);
    const { getAllByTestId, queryByTestId } = renderWithProviders(
      <Timeline
        commits={commits}
        prEvents={[]}
        checkRuns={[]}
        today={TODAY}
        reposById={new Map()}
      />,
    );

    expect(getAllByTestId(TEST_IDS.activity.timeline.day)).toHaveLength(3);
    expect(queryByTestId(TEST_IDS.activity.timeline.showMore)).not.toBeInTheDocument();
  });
});
