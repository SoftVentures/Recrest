import type { Meta, StoryObj } from "@storybook/react-vite";

import { RemoteRepoCardSkeleton } from "@/components/molecules/skeletons/RemoteRepoCardSkeleton";

const meta: Meta<typeof RemoteRepoCardSkeleton> = {
  title: "Molecules/Skeletons/RemoteRepoCardSkeleton",
  component: RemoteRepoCardSkeleton,
};

export default meta;

export const Single: StoryObj<typeof RemoteRepoCardSkeleton> = {};

export const Stack: StoryObj<typeof RemoteRepoCardSkeleton> = {
  render: () => (
    <div style={{ width: 560 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <RemoteRepoCardSkeleton key={i} />
      ))}
    </div>
  ),
};
