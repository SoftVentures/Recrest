import type { Meta, StoryObj } from "@storybook/react-vite";

import { Kbd } from "@/components/atoms/Kbd";

const meta: Meta<typeof Kbd> = {
  title: "Atoms/Kbd",
  component: Kbd,
};

export default meta;

export const Single: StoryObj<typeof Kbd> = { args: { children: "⌘K" } };
export const Combo: StoryObj<typeof Kbd> = { args: { children: "Ctrl+Shift+P" } };
