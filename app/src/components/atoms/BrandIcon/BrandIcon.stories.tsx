import type { Meta, StoryObj } from "@storybook/react-vite";

import { BrandIcon } from "@/components/atoms/BrandIcon";

const meta: Meta<typeof BrandIcon> = {
  title: "Atoms/BrandIcon",
  component: BrandIcon,
  args: { size: 32, color: "brand" },
};

export default meta;

export const GitHub: StoryObj<typeof BrandIcon> = { args: { slug: "github" } };
export const GitLab: StoryObj<typeof BrandIcon> = { args: { slug: "gitlab" } };
export const Bitbucket: StoryObj<typeof BrandIcon> = { args: { slug: "bitbucket" } };
export const Monochrome: StoryObj<typeof BrandIcon> = {
  args: { slug: "github", color: "currentColor" },
};
