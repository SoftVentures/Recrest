import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";

import EmptyState from "@/components/molecules/feedback/EmptyState";

const meta = {
  title: "Molecules/Feedback/EmptyState",
  component: EmptyState,
  args: {
    title: "Nothing here yet",
    description: "Connect a provider or add a local repository to get started.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMascot: Story = { args: { mascot: "shrugging" } };
export const WithIcon: Story = { args: { icon: Inbox } };
export const Plain: Story = {};
