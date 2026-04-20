import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReviewQueueCard } from "@/components/organisms/activity/cards/ReviewQueueCard";

const meta: Meta<typeof ReviewQueueCard> = {
  title: "Organisms/Activity/ReviewQueueCard",
  component: ReviewQueueCard,
};
export default meta;

export const Default: StoryObj<typeof ReviewQueueCard> = {
  args: {
    entries: [
      {
        repoId: "r1",
        repoName: "recrest",
        number: 142,
        title: "feat: activity cockpit",
        author: "alice",
        url: "https://example.com/pr/142",
        openedAt: "2026-04-01T09:00:00Z",
        ageDays: 19,
      },
      {
        repoId: "r1",
        repoName: "recrest",
        number: 151,
        title: "chore: deps",
        author: "bob",
        url: "https://example.com/pr/151",
        openedAt: "2026-04-12T12:00:00Z",
        ageDays: 8,
      },
    ],
  },
};

export const Empty: StoryObj<typeof ReviewQueueCard> = { args: { entries: [] } };
