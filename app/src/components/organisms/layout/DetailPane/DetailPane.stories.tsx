import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { DetailPane } from "@/components/organisms/layout/DetailPane";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const meta: Meta<typeof DetailPane> = {
  title: "Organisms/Layout/DetailPane",
  component: DetailPane,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE}>
          <TooltipProvider>
            <div style={{ display: "flex", height: "100vh" }}>
              <Story />
            </div>
          </TooltipProvider>
        </MemoryRouter>
      </Provider>
    ),
  ],
};
export default meta;

export const Clean: StoryObj<typeof DetailPane> = {
  args: { repo: makeEnrichedRepo(), onClose: () => {} },
};

export const Dirty: StoryObj<typeof DetailPane> = {
  args: {
    repo: makeEnrichedRepo({
      status: {
        branch: "feature/activity",
        head: null,
        ahead: 2,
        behind: 0,
        staged: 1,
        unstaged: 3,
        untracked: 2,
        conflicted: 0,
        dirty: true,
        lastCommit: {
          sha: "abcdef1234567890",
          summary: "feat: activity cockpit",
          author: "alice",
          timestamp: new Date().toISOString(),
        },
        remoteUrl: null,
        changedFiles: [
          {
            path: "app/src/pages/ActivityPage.tsx",
            status: "staged",
            kind: "modified",
            hasUnstagedChanges: false,
          },
          {
            path: "app/src/lib/activityAggregates.ts",
            status: "unstaged",
            kind: "modified",
            hasUnstagedChanges: false,
          },
          {
            path: "shared/src/types/activity.ts",
            status: "untracked",
            kind: "added",
            hasUnstagedChanges: false,
          },
        ],
        changedFilesTruncated: false,
        commitActivity: Array.from({ length: 14 }, () => Math.floor(Math.random() * 5)),
        addedLines: 1280,
        removedLines: 340,
        language: "TypeScript",
        languages: { TypeScript: 780_000, Rust: 210_000, CSS: 92_000, HTML: 12_000 },
      },
    }),
    onClose: () => {},
  },
};
