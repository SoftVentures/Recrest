import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { Timeline } from "@/components/organisms/activity/Timeline";
import {
  fakeCheckRun,
  fakeCommit,
  fakePrEvent,
  fakeRepo,
} from "@/components/organisms/activity/cards/_fixtures";
import "@/i18n";
import { startOfLocalDay } from "@/lib/activityStats";
import { store } from "@/store";

describe("Timeline", () => {
  const today = startOfLocalDay(new Date());
  const reposById = new Map([["r1", fakeRepo("r1")]]);

  it("renders the empty state when there are no events", () => {
    render(
      <Provider store={store}>
        <Timeline commits={[]} prEvents={[]} checkRuns={[]} today={today} reposById={reposById} />
      </Provider>,
    );
    expect(screen.getByText(/No events match/i)).toBeInTheDocument();
  });

  it("renders a day card when there is at least one commit", () => {
    const { container } = render(
      <Provider store={store}>
        <Timeline
          commits={[fakeCommit("sha1", "r1", "alice", today.toISOString())]}
          prEvents={[fakePrEvent("merged", { timestamp: today.toISOString() })]}
          checkRuns={[fakeCheckRun()]}
          today={today}
          reposById={reposById}
        />
      </Provider>,
    );
    expect(container.querySelector(".a-act-day-card")).not.toBeNull();
  });
});
