import type { Meta, StoryObj } from "@storybook/react-vite";

import { BrandMark } from "@/components/organisms/brand/BrandMark";

const meta: Meta<typeof BrandMark> = {
  title: "Organisms/Brand/BrandMark",
  component: BrandMark,
};
export default meta;

export const Default: StoryObj<typeof BrandMark> = { args: { size: 40 } };
export const Large: StoryObj<typeof BrandMark> = { args: { size: 128 } };
export const Accent: StoryObj<typeof BrandMark> = {
  args: { size: 64, stroke: "var(--accent)", strokeWidth: 60 },
};
