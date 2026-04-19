import type { Meta, StoryObj } from "@storybook/react-vite";

import { BranchRowSkeleton } from "@/components/molecules/skeletons/BranchRowSkeleton";

const meta: Meta<typeof BranchRowSkeleton> = {
  title: "Molecules/Skeletons/BranchRowSkeleton",
  component: BranchRowSkeleton,
};

export default meta;

export const Default: StoryObj<typeof BranchRowSkeleton> = {};
