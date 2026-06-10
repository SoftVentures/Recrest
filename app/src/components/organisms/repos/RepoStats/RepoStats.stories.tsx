import type { Meta, StoryObj } from "@storybook/react-vite";

import RepoStats from "@/components/organisms/repos/RepoStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";

const demoRepo: EnrichedRepo = {
  id: "demo",
  name: "demo-repo",
  path: "/Users/dev/demo-repo",
  remoteUrl: "https://github.com/example/demo",
  providerId: "github",
  lang: "TypeScript",
  added: 142,
  removed: 38,
  filesChanged: 7,
  activity: [3, 1, 0, 4, 2, 7, 1, 0, 8, 3, 5, 2, 1, 4],
  status: {
    branch: "feature/repo-stats",
    ahead: 3,
    behind: 1,
    dirty: true,
    changedFiles: [],
    changedFilesTruncated: false,
    lastCommit: { author: "Alice", email: null, summary: "rework", time: Date.now() },
  },
} as unknown as EnrichedRepo;

const meta: Meta<typeof RepoStats> = {
  title: "Organisms/Repos/RepoStats",
  component: RepoStats,
  parameters: { layout: "padded" },
  args: {
    repo: demoRepo,
    totalCommits: 41,
    maxBucket: 8,
    openMrsCount: 3,
    draftMrsCount: 1,
  },
};
export default meta;

type Story = StoryObj<typeof RepoStats>;
export const WithProvider: Story = {};
export const NoProvider: Story = { args: { openMrsCount: null, draftMrsCount: null } };
