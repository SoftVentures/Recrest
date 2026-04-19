import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/atoms/Button";

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
};

export default meta;

export const Default: StoryObj<typeof Button> = { args: { children: "Click me" } };
export const Outline: StoryObj<typeof Button> = {
  args: { children: "Outline", variant: "outline" },
};
export const Secondary: StoryObj<typeof Button> = {
  args: { children: "Secondary", variant: "secondary" },
};
export const Ghost: StoryObj<typeof Button> = {
  args: { children: "Ghost", variant: "ghost" },
};
export const Destructive: StoryObj<typeof Button> = {
  args: { children: "Destructive", variant: "destructive" },
};
export const Link: StoryObj<typeof Button> = {
  args: { children: "Link", variant: "link" },
};
