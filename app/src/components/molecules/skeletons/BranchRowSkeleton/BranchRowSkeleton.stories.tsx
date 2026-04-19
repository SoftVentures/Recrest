import type { Meta, StoryObj } from "@storybook/react-vite";

import { BranchRowSkeleton } from "@/components/molecules/skeletons/BranchRowSkeleton";

const meta: Meta<typeof BranchRowSkeleton> = {
  title: "Molecules/Skeletons/BranchRowSkeleton",
  component: BranchRowSkeleton,
};

export default meta;

export const Single: StoryObj<typeof BranchRowSkeleton> = {};

export const List: StoryObj<typeof BranchRowSkeleton> = {
  render: () => (
    <div style={{ width: 520 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <BranchRowSkeleton key={i} />
      ))}
    </div>
  ),
};
