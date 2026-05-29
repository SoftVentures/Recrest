import type { Meta, StoryObj } from "@storybook/react-vite";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";

const meta = {
  title: "Atoms/Avatars/AuthorAvatar",
  component: AuthorAvatar,
  args: { name: "Sasha Park", email: "sasha@example.com", size: 40 },
} satisfies Meta<typeof AuthorAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 20 } };
