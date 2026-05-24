import type { RecentCommit } from "@recrest/shared";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { FeedEventRow } from "@/components/organisms/activity/Timeline/parts/FeedEventRow";
import type { FeedEvent } from "@/components/organisms/activity/Timeline/parts/_shared";
import { FeedEventKind } from "@/lib/constants/feedEventKinds.constants";

const commit: RecentCommit = {
  repoId: "r1",
  repoName: "recrest",
  sha: "abc1234",
  author: "valentin",
  authorEmail: "v@example.com",
  summary: "Add multilingual aria labels",
  timestamp: "2025-02-15T10:00:00Z",
};

const event: FeedEvent = {
  kind: FeedEventKind.COMMIT,
  at: commit.timestamp,
  repo: undefined,
  data: commit,
};

const meta = {
  title: "Organisms/Activity/Timeline/Parts/FeedEventRow",
  component: FeedEventRow,
  args: { event, today: new Date("2025-02-15T12:00:00Z") },
} satisfies Meta<typeof FeedEventRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Commit: Story = {};
