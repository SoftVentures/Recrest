import type { Meta, StoryObj } from "@storybook/react-vite";

import { RemoteRepoListSkeleton } from "@/components/molecules/skeletons/RemoteRepoListSkeleton";

const meta: Meta<typeof RemoteRepoListSkeleton> = {
  title: "Molecules/Skeletons/RemoteRepoListSkeleton",
  component: RemoteRepoListSkeleton,
};

export default meta;

export const Default: StoryObj<typeof RemoteRepoListSkeleton> = {};
export const SingleRow: StoryObj<typeof RemoteRepoListSkeleton> = { args: { rows: 1 } };
export const ManyRows: StoryObj<typeof RemoteRepoListSkeleton> = { args: { rows: 12 } };
