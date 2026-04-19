import type { Meta, StoryObj } from "@storybook/react-vite";

import { BranchFilterChip } from "@/components/molecules/BranchFilterChip";

const meta: Meta<typeof BranchFilterChip> = {
  title: "Molecules/BranchFilterChip",
  component: BranchFilterChip,
};

export default meta;

const noop = () => {};

export const Inactive: StoryObj<typeof BranchFilterChip> = {
  args: { active: false, onClick: noop, count: 12, children: "All" },
};

export const Active: StoryObj<typeof BranchFilterChip> = {
  args: { active: true, onClick: noop, count: 3, children: "Ahead" },
};

export const NoCount: StoryObj<typeof BranchFilterChip> = {
  args: { active: false, onClick: noop, children: "Remote" },
};
