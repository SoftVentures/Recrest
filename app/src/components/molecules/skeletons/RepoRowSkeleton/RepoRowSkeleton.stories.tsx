import type { Meta, StoryObj } from "@storybook/react-vite";

import { RepoRowSkeleton } from "@/components/molecules/skeletons/RepoRowSkeleton";

const meta: Meta<typeof RepoRowSkeleton> = {
  title: "Molecules/Skeletons/RepoRowSkeleton",
  component: RepoRowSkeleton,
};

export default meta;

export const Default: StoryObj<typeof RepoRowSkeleton> = {};
