import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";

const meta = {
  title: "Atoms/Avatars/GeneralAvatar",
  component: GeneralAvatar,
  args: {
    size: 40,
    radius: 8,
    gradient: "linear-gradient(135deg, #4f8cff 0%, #7b2ff7 100%)",
    letter: "R",
    label: "Recrest",
  },
} satisfies Meta<typeof GeneralAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Circle: Story = {
  args: { radius: 20 },
};
