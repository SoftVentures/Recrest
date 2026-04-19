import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmptyState } from "@/components/molecules/EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Molecules/EmptyState",
  component: EmptyState,
};

export default meta;

export const Default: StoryObj<typeof EmptyState> = {
  args: {
    title: "Nothing here",
    description: "Add something to get started.",
  },
};
