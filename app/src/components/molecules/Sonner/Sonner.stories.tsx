import type { Meta, StoryObj } from "@storybook/react-vite";

import { Toaster } from "@/components/molecules/Sonner";

const meta: Meta<typeof Toaster> = {
  title: "Molecules/Sonner",
  component: Toaster,
};

export default meta;

export const Default: StoryObj<typeof Toaster> = {};
