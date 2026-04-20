import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";

const meta: Meta<typeof CardShell> = {
  title: "Organisms/Activity/CardShell",
  component: CardShell,
};
export default meta;

export const Default: StoryObj<typeof CardShell> = {
  args: {
    title: "Card title",
    sub: "optional sub-line",
    children: <div>card content goes here</div>,
  },
};
