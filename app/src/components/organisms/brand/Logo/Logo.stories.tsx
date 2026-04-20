import type { Meta, StoryObj } from "@storybook/react-vite";

import { Logo } from "@/components/organisms/brand/Logo";

const meta: Meta<typeof Logo> = {
  title: "Organisms/Brand/Logo",
  component: Logo,
};
export default meta;

export const Default: StoryObj<typeof Logo> = {
  args: { className: "h-10 w-10" },
};

export const Large: StoryObj<typeof Logo> = {
  args: { className: "h-24 w-24" },
};
