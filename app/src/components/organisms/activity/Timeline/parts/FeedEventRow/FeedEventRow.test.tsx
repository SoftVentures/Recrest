import { Box } from "@mui/material";

import type { RecentCommit } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { FeedEventRow } from "@/components/organisms/activity/Timeline/parts/FeedEventRow";
import type { FeedEvent } from "@/components/organisms/activity/Timeline/parts/_shared";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { FeedEventKind } from "@/lib/constants/feedEventKinds.constants";
import { renderWithProviders } from "@/test/utils";

const commit: RecentCommit = {
  repoId: "r1",
  repoName: "recrest",
  sha: "abc1234",
  author: "sasha",
  authorEmail: "v@example.com",
  summary: "Add aria labels",
  timestamp: "2025-02-15T10:00:00Z",
};

const event: FeedEvent = {
  kind: FeedEventKind.COMMIT,
  at: commit.timestamp,
  repo: undefined,
  data: commit,
};

describe("FeedEventRow", () => {
  it("renders inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <FeedEventRow event={event} today={new Date("2025-02-15T12:00:00Z")} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});
