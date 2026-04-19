import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReviewerChipsSkeleton } from "@/components/molecules/skeletons/ReviewerChipsSkeleton";

const meta: Meta<typeof ReviewerChipsSkeleton> = {
  title: "Molecules/Skeletons/ReviewerChipsSkeleton",
  component: ReviewerChipsSkeleton,
};

export default meta;

export const Default: StoryObj<typeof ReviewerChipsSkeleton> = {};
