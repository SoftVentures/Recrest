import type { Meta, StoryObj } from "@storybook/react-vite";

import AheadBehind from "@/components/atoms/git/AheadBehind";

const meta: Meta<typeof AheadBehind> = {
  title: "Atoms/Git/AheadBehind",
  component: AheadBehind,
  args: {
    ahead: 5,
    behind: 3,
    size: "sm",
    variant: "compact",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    variant: { control: "inline-radio", options: ["compact", "separated"] },
    hideZero: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof AheadBehind>;

export const Compact: Story = {};
export const CompactMedium: Story = { args: { size: "md" } };
export const Separated: Story = { args: { variant: "separated" } };
export const ZeroBehind: Story = { args: { behind: 0 } };
export const ZeroAhead: Story = { args: { ahead: 0 } };
export const BothZero: Story = { args: { ahead: 0, behind: 0 } };
export const BothZeroShown: Story = {
  args: { ahead: 0, behind: 0, hideZero: false },
};
