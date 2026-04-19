import type { Meta, StoryObj } from "@storybook/react-vite";

import { RepoListSkeleton } from "@/components/molecules/skeletons/RepoListSkeleton";

const meta: Meta<typeof RepoListSkeleton> = {
  title: "Molecules/Skeletons/RepoListSkeleton",
  component: RepoListSkeleton,
};

export default meta;

export const Default: StoryObj<typeof RepoListSkeleton> = {};
export const SingleRow: StoryObj<typeof RepoListSkeleton> = { args: { rows: 1 } };
export const TenRows: StoryObj<typeof RepoListSkeleton> = { args: { rows: 10 } };
