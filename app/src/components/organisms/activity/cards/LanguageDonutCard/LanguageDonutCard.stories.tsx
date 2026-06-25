import type { Meta, StoryObj } from "@storybook/react-vite";

import LanguageDonutCard from "@/components/organisms/activity/cards/LanguageDonutCard";

const meta = {
  title: "Organisms/Activity/Cards/LanguageDonutCard",
  component: LanguageDonutCard,
  args: {
    mix: [
      {
        language: "TypeScript",
        color: "#3178c6",
        share: 0.6,
        commits: 60,
        contributors: [
          { repoId: "repo-web", repoName: "web-app", share: 0.55 },
          { repoId: "repo-api", repoName: "api-gateway", share: 0.3 },
          { repoId: "repo-cli", repoName: "cli-tools", share: 0.15 },
        ],
      },
      {
        language: "Rust",
        color: "#dea584",
        share: 0.25,
        commits: 25,
        contributors: [{ repoId: "repo-core", repoName: "core-engine", share: 1 }],
      },
      {
        language: "Python",
        color: "#3572A5",
        share: 0.15,
        commits: 15,
        contributors: [
          { repoId: "repo-ml", repoName: "ml-pipeline", share: 0.7 },
          { repoId: "repo-api", repoName: "api-gateway", share: 0.3 },
        ],
      },
    ],
  },
} satisfies Meta<typeof LanguageDonutCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { mix: [] } };
export const Loading: Story = { args: { loading: true } };
