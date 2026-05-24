import type { Meta, StoryObj } from "@storybook/react-vite";

import QuietestReposCard from "@/components/organisms/activity/cards/QuietestReposCard";

const meta = {
  title: "Organisms/Activity/Cards/QuietestReposCard",
  component: QuietestReposCard,
  args: {
    quietestRepoIds: [],
    reposById: new Map(),
  },
} satisfies Meta<typeof QuietestReposCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
