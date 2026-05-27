import type { Meta, StoryObj } from "@storybook/react-vite";

import ReviewQueueCard from "@/components/organisms/activity/cards/ReviewQueueCard";

const meta = {
  title: "Organisms/Activity/Cards/ReviewQueueCard",
  component: ReviewQueueCard,
  args: {
    entries: [
      {
        repoId: "r1",
        repoName: "recrest",
        number: 42,
        title: "Add multilingual aria labels",
        author: "valentin",
        url: "https://github.com/recrest/example/pull/42",
        openedAt: "2025-02-10T12:00:00Z",
        ageDays: 5,
      },
    ],
  },
} satisfies Meta<typeof ReviewQueueCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { entries: [] } };
export const Loading: Story = { args: { loading: true } };
