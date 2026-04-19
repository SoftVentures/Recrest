import type { Meta, StoryObj } from "@storybook/react-vite";

import { MrRowSkeleton } from "@/components/molecules/skeletons/MrRowSkeleton";

const meta: Meta<typeof MrRowSkeleton> = {
  title: "Molecules/Skeletons/MrRowSkeleton",
  component: MrRowSkeleton,
};

export default meta;

export const Default: StoryObj<typeof MrRowSkeleton> = {};
