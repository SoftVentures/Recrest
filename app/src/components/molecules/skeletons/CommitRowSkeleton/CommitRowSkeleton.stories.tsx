import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommitRowSkeleton } from "@/components/molecules/skeletons/CommitRowSkeleton";

const meta: Meta<typeof CommitRowSkeleton> = {
  title: "Molecules/Skeletons/CommitRowSkeleton",
  component: CommitRowSkeleton,
};

export default meta;

export const Default: StoryObj<typeof CommitRowSkeleton> = {};
