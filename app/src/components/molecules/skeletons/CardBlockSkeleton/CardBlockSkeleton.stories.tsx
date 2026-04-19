import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardBlockSkeleton } from "@/components/molecules/skeletons/CardBlockSkeleton";

const meta: Meta<typeof CardBlockSkeleton> = {
  title: "Molecules/Skeletons/CardBlockSkeleton",
  component: CardBlockSkeleton,
};

export default meta;

export const Default: StoryObj<typeof CardBlockSkeleton> = {};
export const SingleRow: StoryObj<typeof CardBlockSkeleton> = { args: { rows: 1 } };
export const FiveRows: StoryObj<typeof CardBlockSkeleton> = { args: { rows: 5 } };
export const WithoutTitle: StoryObj<typeof CardBlockSkeleton> = {
  args: { rows: 3, title: false },
};
