import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActivityBarsSkeleton } from "@/components/molecules/skeletons/ActivityBarsSkeleton";

const meta: Meta<typeof ActivityBarsSkeleton> = {
  title: "Molecules/Skeletons/ActivityBarsSkeleton",
  component: ActivityBarsSkeleton,
};

export default meta;

export const Default: StoryObj<typeof ActivityBarsSkeleton> = {};
