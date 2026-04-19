import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";

const meta: Meta<typeof CommitListSkeleton> = {
  title: "Molecules/Skeletons/CommitListSkeleton",
  component: CommitListSkeleton,
};

export default meta;

export const Default: StoryObj<typeof CommitListSkeleton> = {};
