import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChurnCard } from "@/components/organisms/activity/cards/ChurnCard";

const meta: Meta<typeof ChurnCard> = {
  title: "Organisms/Activity/ChurnCard",
  component: ChurnCard,
};
export default meta;

export const Default: StoryObj<typeof ChurnCard> = {
  args: {
    rows: [
      { repoId: "r1", repoName: "recrest", added: 1240, removed: 320, total: 1560 },
      { repoId: "r2", repoName: "landing", added: 220, removed: 80, total: 300 },
      { repoId: "r3", repoName: "shared", added: 180, removed: 60, total: 240 },
    ],
  },
};

export const Empty: StoryObj<typeof ChurnCard> = { args: { rows: [] } };
