import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/atoms/Badge";

const meta: Meta<typeof Badge> = {
  title: "Atoms/Badge",
  component: Badge,
};

export default meta;

export const Default: StoryObj<typeof Badge> = { args: { children: "Badge" } };
export const Secondary: StoryObj<typeof Badge> = {
  args: { children: "Secondary", variant: "secondary" },
};
export const Destructive: StoryObj<typeof Badge> = {
  args: { children: "Destructive", variant: "destructive" },
};
export const Outline: StoryObj<typeof Badge> = {
  args: { children: "Outline", variant: "outline" },
};
