import type { Meta, StoryObj } from "@storybook/react-vite";

import { SearchGroupSkeleton } from "@/components/molecules/skeletons/SearchGroupSkeleton";

const meta: Meta<typeof SearchGroupSkeleton> = {
  title: "Molecules/Skeletons/SearchGroupSkeleton",
  component: SearchGroupSkeleton,
};

export default meta;

export const Default: StoryObj<typeof SearchGroupSkeleton> = {};
