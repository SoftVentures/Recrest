import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { RepoDetail } from "@/components/organisms/repos/RepoDetail";
import { store } from "@/store";
import { makeRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof RepoDetail> = {
  title: "Organisms/Repos/RepoDetail",
  component: RepoDetail,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </Provider>
    ),
  ],
};
export default meta;

export const Clean: StoryObj<typeof RepoDetail> = {
  args: { repo: makeRepo() },
};

export const WithChanges: StoryObj<typeof RepoDetail> = {
  args: {
    repo: makeRepo({
      status: {
        branch: "feature/activity",
        head: null,
        ahead: 1,
        behind: 2,
        staged: 2,
        unstaged: 1,
        untracked: 3,
        conflicted: 0,
        dirty: true,
        lastCommit: {
          sha: "abcdef1",
          summary: "feat: cockpit layout",
          author: "alice",
          timestamp: new Date().toISOString(),
        },
        remoteUrl: null,
        changedFiles: [
          { path: "src/a.ts", status: "staged", kind: "modified", hasUnstagedChanges: false },
          { path: "src/b.ts", status: "unstaged", kind: "modified", hasUnstagedChanges: false },
          { path: "src/c.ts", status: "untracked", kind: "added", hasUnstagedChanges: false },
        ],
        changedFilesTruncated: false,
        commitActivity: Array.from({ length: 14 }, () => 0),
        addedLines: 120,
        removedLines: 30,
        language: "TypeScript",
        languages: { TypeScript: 420_000, CSS: 64_000, HTML: 18_000 },
      },
    }),
  },
};
