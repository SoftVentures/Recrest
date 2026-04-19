import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommitRowSkeleton } from "@/components/molecules/skeletons/CommitRowSkeleton";

const meta: Meta<typeof CommitRowSkeleton> = {
  title: "Molecules/Skeletons/CommitRowSkeleton",
  component: CommitRowSkeleton,
};

export default meta;

export const Single: StoryObj<typeof CommitRowSkeleton> = {};

export const Stack: StoryObj<typeof CommitRowSkeleton> = {
  render: () => (
    <div style={{ width: 420 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <CommitRowSkeleton key={i} />
      ))}
    </div>
  ),
};
