import type { Meta, StoryObj } from "@storybook/react-vite";

import { Spinner } from "@/components/atoms/Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Atoms/Spinner",
  component: Spinner,
};

export default meta;

export const Default: StoryObj<typeof Spinner> = {};
