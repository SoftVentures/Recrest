import type { Meta, StoryObj } from "@storybook/react-vite";

import { InfoCard } from "@/components/molecules/InfoCard";

const meta: Meta<typeof InfoCard> = {
  title: "Molecules/InfoCard",
  component: InfoCard,
};

export default meta;

export const WithTitle: StoryObj<typeof InfoCard> = {
  args: { title: "Remote", children: "origin/main" },
};

export const TitleOnly: StoryObj<typeof InfoCard> = {
  args: { title: "Last commit", children: "ci(deps): bump deps (2 days ago)" },
};
