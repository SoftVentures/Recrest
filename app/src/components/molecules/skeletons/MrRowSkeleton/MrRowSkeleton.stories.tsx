import type { Meta, StoryObj } from "@storybook/react-vite";

import { MrRowSkeleton } from "@/components/molecules/skeletons/MrRowSkeleton";

const meta: Meta<typeof MrRowSkeleton> = {
  title: "Molecules/Skeletons/MrRowSkeleton",
  component: MrRowSkeleton,
};

export default meta;

export const Single: StoryObj<typeof MrRowSkeleton> = {};

export const Stack: StoryObj<typeof MrRowSkeleton> = {
  render: () => (
    <div className="a-mr-rows" style={{ width: 560 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <MrRowSkeleton key={i} />
      ))}
    </div>
  ),
};
