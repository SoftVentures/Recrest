import type { Meta, StoryObj } from "@storybook/react-vite";

import { LanguageDonutCard } from "@/components/organisms/activity/cards/LanguageDonutCard";

const meta: Meta<typeof LanguageDonutCard> = {
  title: "Organisms/Activity/LanguageDonutCard",
  component: LanguageDonutCard,
};
export default meta;

export const Default: StoryObj<typeof LanguageDonutCard> = {
  args: {
    mix: [
      { language: "TypeScript", color: "#3178c6", share: 0.55, commits: 22 },
      { language: "Rust", color: "#dea584", share: 0.25, commits: 10 },
      { language: "Python", color: "#3572A5", share: 0.15, commits: 6 },
      { language: "Other", color: "#8a8a9a", share: 0.05, commits: 2 },
    ],
  },
};
