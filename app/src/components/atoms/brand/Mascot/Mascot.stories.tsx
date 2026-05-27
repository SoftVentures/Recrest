import type { Meta, StoryObj } from "@storybook/react-vite";

import Mascot from "@/components/atoms/brand/Mascot";

const meta = {
  title: "Atoms/Brand/Mascot",
  component: Mascot,
  args: { size: 128 },
  argTypes: {
    variant: {
      control: "select",
      options: ["shrugging", "snoozing", "celebrating", "searching", "waving"],
    },
  },
} satisfies Meta<typeof Mascot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Shrugging: Story = { args: { variant: "shrugging" } };
export const Snoozing: Story = { args: { variant: "snoozing" } };
export const Celebrating: Story = { args: { variant: "celebrating" } };
export const Searching: Story = { args: { variant: "searching" } };
export const Waving: Story = { args: { variant: "waving" } };
