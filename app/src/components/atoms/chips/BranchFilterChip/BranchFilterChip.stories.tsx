import type { Meta, StoryObj } from "@storybook/react-vite";

import BranchFilterChip from "@/components/atoms/chips/BranchFilterChip";

const meta: Meta<typeof BranchFilterChip> = {
  title: "Atoms/Chips/BranchFilterChip",
  component: BranchFilterChip,
  args: {
    tone: "current",
    children: "current",
  },
  argTypes: {
    tone: { control: "inline-radio", options: ["current", "dirty", "clean", "remote"] },
  },
};

export default meta;

type Story = StoryObj<typeof BranchFilterChip>;

export const Current: Story = {};
export const Dirty: Story = { args: { tone: "dirty", children: "dirty" } };
export const Clean: Story = { args: { tone: "clean", children: "clean" } };
export const Remote: Story = { args: { tone: "remote", children: "remote" } };
