import type { Meta, StoryObj } from "@storybook/react-vite";

import { SearchHitSkeleton } from "@/components/molecules/skeletons/SearchHitSkeleton";

const meta: Meta<typeof SearchHitSkeleton> = {
  title: "Molecules/Skeletons/SearchHitSkeleton",
  component: SearchHitSkeleton,
};

export default meta;

export const Single: StoryObj<typeof SearchHitSkeleton> = {};

export const Stack: StoryObj<typeof SearchHitSkeleton> = {
  render: () => (
    <div style={{ width: 420 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SearchHitSkeleton key={i} />
      ))}
    </div>
  ),
};
