import type { Meta, StoryObj } from "@storybook/react-vite";

import { MrChip } from "@/components/molecules/MrChip";

const meta: Meta<typeof MrChip> = {
  title: "Molecules/MrChip",
  component: MrChip,
};

export default meta;

export const Inactive: StoryObj<typeof MrChip> = {
  args: { active: false, children: "Open", count: 12 },
};

export const Active: StoryObj<typeof MrChip> = {
  args: { active: true, children: "Draft", count: 3 },
};
