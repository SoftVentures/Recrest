import type { Meta, StoryObj } from "@storybook/react-vite";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";

const meta = {
  title: "Atoms/Avatars/RepoAvatar",
  component: RepoAvatar,
  args: { repo: { id: "recrest", name: "Recrest" }, size: 40, radius: 8 },
} satisfies Meta<typeof RepoAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PreservesNonLetterPrefix: Story = {
  args: { repo: { id: "x", name: "_dotfiles" } },
};
