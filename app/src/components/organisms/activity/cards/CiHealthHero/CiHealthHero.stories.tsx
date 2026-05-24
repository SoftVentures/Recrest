import type { Meta, StoryObj } from "@storybook/react-vite";

import CiHealthHero from "@/components/organisms/activity/cards/CiHealthHero";

const meta = {
  title: "Organisms/Activity/Cards/CiHealthHero",
  component: CiHealthHero,
  args: { summaries: [] },
} satisfies Meta<typeof CiHealthHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithRuns: Story = {
  args: {
    summaries: [
      {
        repoId: "r1",
        repoName: "recrest",
        day: "2025-02-15",
        total: 30,
        passed: 27,
        failed: 3,
        shaSamples: [],
      },
      {
        repoId: "r2",
        repoName: "shared",
        day: "2025-02-15",
        total: 18,
        passed: 17,
        failed: 1,
        shaSamples: [],
      },
    ],
  },
};
