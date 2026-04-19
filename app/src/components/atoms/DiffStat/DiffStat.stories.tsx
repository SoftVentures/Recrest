import type { Meta, StoryObj } from "@storybook/react-vite";

import { DiffStat } from "@/components/atoms/DiffStat";

const meta: Meta<typeof DiffStat> = {
  title: "Atoms/DiffStat",
  component: DiffStat,
};

export default meta;

export const Mixed: StoryObj<typeof DiffStat> = { args: { added: 42, removed: 17 } };
export const OnlyAdded: StoryObj<typeof DiffStat> = { args: { added: 12, removed: 0 } };
export const OnlyRemoved: StoryObj<typeof DiffStat> = { args: { added: 0, removed: 53 } };
