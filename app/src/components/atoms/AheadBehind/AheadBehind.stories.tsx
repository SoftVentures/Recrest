import type { Meta, StoryObj } from "@storybook/react-vite";

import { AheadBehind } from "@/components/atoms/AheadBehind";

const meta: Meta<typeof AheadBehind> = {
  title: "Atoms/AheadBehind",
  component: AheadBehind,
};

export default meta;

export const Even: StoryObj<typeof AheadBehind> = { args: { ahead: 0, behind: 0 } };
export const Ahead: StoryObj<typeof AheadBehind> = { args: { ahead: 3, behind: 0 } };
export const Behind: StoryObj<typeof AheadBehind> = { args: { ahead: 0, behind: 2 } };
export const Diverged: StoryObj<typeof AheadBehind> = { args: { ahead: 3, behind: 2 } };
