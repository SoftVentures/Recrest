import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "@/components/atoms/Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Atoms/Skeleton",
  component: Skeleton,
};

export default meta;

export const Line: StoryObj<typeof Skeleton> = { args: { className: "h-3 w-48" } };
export const LongLine: StoryObj<typeof Skeleton> = { args: { className: "h-3 w-full" } };
export const Block: StoryObj<typeof Skeleton> = { args: { className: "h-16 w-64" } };
export const Circle: StoryObj<typeof Skeleton> = { args: { className: "h-8 w-8 rounded-full" } };
export const Avatar: StoryObj<typeof Skeleton> = {
  args: { className: "h-10 w-10 rounded-full" },
};
