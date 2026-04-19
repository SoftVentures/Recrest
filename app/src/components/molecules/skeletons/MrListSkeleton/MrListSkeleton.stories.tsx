import type { Meta, StoryObj } from "@storybook/react-vite";

import { MrListSkeleton } from "@/components/molecules/skeletons/MrListSkeleton";

const meta: Meta<typeof MrListSkeleton> = {
  title: "Molecules/Skeletons/MrListSkeleton",
  component: MrListSkeleton,
};

export default meta;

export const Default: StoryObj<typeof MrListSkeleton> = {};
export const SingleRow: StoryObj<typeof MrListSkeleton> = { args: { rows: 1 } };
export const TenRows: StoryObj<typeof MrListSkeleton> = { args: { rows: 10 } };
