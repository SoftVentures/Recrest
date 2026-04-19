import type { Meta, StoryObj } from "@storybook/react-vite";

import { BranchChip } from "@/components/atoms/BranchChip";

const meta: Meta<typeof BranchChip> = {
  title: "Atoms/BranchChip",
  component: BranchChip,
};

export default meta;

export const Main: StoryObj<typeof BranchChip> = { args: { branch: "main" } };
export const Feature: StoryObj<typeof BranchChip> = {
  args: { branch: "feature/new-thing" },
};
export const Small: StoryObj<typeof BranchChip> = {
  args: { branch: "main", size: "sm" },
};
export const Big: StoryObj<typeof BranchChip> = {
  args: { branch: "main", size: "big" },
};
