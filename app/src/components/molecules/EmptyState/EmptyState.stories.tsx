import type { Meta, StoryObj } from "@storybook/react-vite";
import { GitPullRequest } from "lucide-react";

import { EmptyState } from "@/components/molecules/EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Molecules/EmptyState",
  component: EmptyState,
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "Nothing here",
    description: "Add something to get started.",
  },
};

export const WithLucideIcon: Story = {
  args: {
    icon: GitPullRequest,
    title: "No open merge requests",
    description: "When something comes in, it'll show up here.",
  },
};

export const Snoozing: Story = {
  args: {
    mascot: "snoozing",
    title: "No open merge requests",
    description: "Everything's quiet — enjoy it while it lasts.",
  },
};

export const Celebrating: Story = {
  args: {
    mascot: "celebrating",
    title: "Everything clean and in sync",
    description: "Nothing needs your attention right now.",
  },
};

export const Searching: Story = {
  args: {
    mascot: "searching",
    title: "No branches match your filter",
    description: "Try a broader filter or clear it.",
  },
};

export const Waving: Story = {
  args: {
    mascot: "waving",
    title: "Nothing here yet",
    description: "Add your first repository to get started.",
  },
};

export const Shrugging: Story = {
  args: {
    mascot: "shrugging",
    title: "Nothing to show",
    description: "There's just nothing here — yet.",
  },
};
