import type { Meta, StoryObj } from "@storybook/react-vite";

import { CiHealthHero } from "@/components/organisms/activity/cards/CiHealthHero";
import { fakeCheckRun } from "@/components/organisms/activity/cards/_fixtures";

const meta: Meta<typeof CiHealthHero> = {
  title: "Organisms/Activity/CiHealthHero",
  component: CiHealthHero,
};
export default meta;

export const Healthy: StoryObj<typeof CiHealthHero> = {
  args: { summaries: [fakeCheckRun({ total: 50, passed: 49, failed: 1 })] },
};

export const Degraded: StoryObj<typeof CiHealthHero> = {
  args: { summaries: [fakeCheckRun({ total: 20, passed: 14, failed: 6 })] },
};

export const Failing: StoryObj<typeof CiHealthHero> = {
  args: { summaries: [fakeCheckRun({ total: 10, passed: 3, failed: 7 })] },
};

export const Empty: StoryObj<typeof CiHealthHero> = { args: { summaries: [] } };
