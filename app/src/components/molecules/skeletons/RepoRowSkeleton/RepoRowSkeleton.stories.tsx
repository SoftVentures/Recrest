import type { Meta, StoryObj } from "@storybook/react-vite";

import { RepoRowSkeleton } from "@/components/molecules/skeletons/RepoRowSkeleton";

const meta: Meta<typeof RepoRowSkeleton> = {
  title: "Molecules/Skeletons/RepoRowSkeleton",
  component: RepoRowSkeleton,
};

export default meta;

export const Single: StoryObj<typeof RepoRowSkeleton> = {};

export const Stack: StoryObj<typeof RepoRowSkeleton> = {
  render: () => (
    <div className="a-table" style={{ width: 860 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <RepoRowSkeleton key={i} />
      ))}
    </div>
  ),
};
