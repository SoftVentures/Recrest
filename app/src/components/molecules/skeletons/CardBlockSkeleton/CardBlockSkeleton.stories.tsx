import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardBlockSkeleton } from "@/components/molecules/skeletons/CardBlockSkeleton";

const meta: Meta<typeof CardBlockSkeleton> = {
  title: "Molecules/Skeletons/CardBlockSkeleton",
  component: CardBlockSkeleton,
};

export default meta;

export const Default: StoryObj<typeof CardBlockSkeleton> = {};
