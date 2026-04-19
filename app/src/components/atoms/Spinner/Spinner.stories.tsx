import type { Meta, StoryObj } from "@storybook/react-vite";

import { Spinner } from "@/components/atoms/Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Atoms/Spinner",
  component: Spinner,
};

export default meta;

export const Default: StoryObj<typeof Spinner> = {};
export const Small: StoryObj<typeof Spinner> = { args: { size: "sm" } };
export const Large: StoryObj<typeof Spinner> = { args: { size: "lg" } };
export const WithLabel: StoryObj<typeof Spinner> = {
  args: { size: "md", label: "Loading repositories" },
};
