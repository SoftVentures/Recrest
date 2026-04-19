import type { Meta, StoryObj } from "@storybook/react-vite";

import { SearchGroupSkeleton } from "@/components/molecules/skeletons/SearchGroupSkeleton";

const meta: Meta<typeof SearchGroupSkeleton> = {
  title: "Molecules/Skeletons/SearchGroupSkeleton",
  component: SearchGroupSkeleton,
};

export default meta;

export const Default: StoryObj<typeof SearchGroupSkeleton> = {};
export const SingleRow: StoryObj<typeof SearchGroupSkeleton> = { args: { rows: 1 } };
export const ManyRows: StoryObj<typeof SearchGroupSkeleton> = { args: { rows: 6 } };
