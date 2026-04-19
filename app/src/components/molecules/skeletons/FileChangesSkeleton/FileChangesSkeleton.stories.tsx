import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileChangesSkeleton } from "@/components/molecules/skeletons/FileChangesSkeleton";

const meta: Meta<typeof FileChangesSkeleton> = {
  title: "Molecules/Skeletons/FileChangesSkeleton",
  component: FileChangesSkeleton,
};

export default meta;

export const Default: StoryObj<typeof FileChangesSkeleton> = {};
export const SingleRow: StoryObj<typeof FileChangesSkeleton> = { args: { rows: 1 } };
export const ManyRows: StoryObj<typeof FileChangesSkeleton> = { args: { rows: 12 } };
