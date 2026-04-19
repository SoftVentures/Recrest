import type { Meta, StoryObj } from "@storybook/react-vite";

import { RemoteRepoCardSkeleton } from "@/components/molecules/skeletons/RemoteRepoCardSkeleton";

const meta: Meta<typeof RemoteRepoCardSkeleton> = {
  title: "Molecules/Skeletons/RemoteRepoCardSkeleton",
  component: RemoteRepoCardSkeleton,
};

export default meta;

export const Default: StoryObj<typeof RemoteRepoCardSkeleton> = {};
