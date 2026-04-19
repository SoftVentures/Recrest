import type { Meta, StoryObj } from "@storybook/react-vite";

import { SearchHitSkeleton } from "@/components/molecules/skeletons/SearchHitSkeleton";

const meta: Meta<typeof SearchHitSkeleton> = {
  title: "Molecules/Skeletons/SearchHitSkeleton",
  component: SearchHitSkeleton,
};

export default meta;

export const Default: StoryObj<typeof SearchHitSkeleton> = {};
