import type { Meta, StoryObj } from "@storybook/react-vite";

import { Sparkline } from "@/components/atoms/Sparkline";

const meta: Meta<typeof Sparkline> = {
  title: "Atoms/Sparkline",
  component: Sparkline,
};

export default meta;

export const Default: StoryObj<typeof Sparkline> = {
  args: { data: [3, 5, 2, 8, 12, 4, 6, 9, 1, 0, 7, 3, 5, 10] },
};

export const Empty: StoryObj<typeof Sparkline> = {
  args: { data: [0, 0, 0, 0, 0, 0, 0] },
};

export const Active: StoryObj<typeof Sparkline> = {
  args: { data: [3, 5, 2, 8, 12, 4, 6], active: true },
};
