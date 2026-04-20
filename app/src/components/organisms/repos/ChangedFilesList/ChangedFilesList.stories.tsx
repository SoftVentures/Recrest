import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChangedFilesList } from "@/components/organisms/repos/ChangedFilesList";

const meta: Meta<typeof ChangedFilesList> = {
  title: "Organisms/Repos/ChangedFilesList",
  component: ChangedFilesList,
  parameters: { layout: "padded" },
};
export default meta;

export const Clean: StoryObj<typeof ChangedFilesList> = {
  args: { files: [], truncated: false },
};

export const Mixed: StoryObj<typeof ChangedFilesList> = {
  args: {
    files: [
      {
        path: "src/pages/ActivityPage.tsx",
        status: "staged",
        kind: "modified",
        hasUnstagedChanges: true,
      },
      {
        path: "src/lib/activityAggregates.ts",
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
      {
        path: "app/src-tauri/src/providers/github.rs",
        status: "conflicted",
        kind: "modified",
        hasUnstagedChanges: false,
      },
    ],
    truncated: false,
  },
};

export const Truncated: StoryObj<typeof ChangedFilesList> = {
  args: {
    files: Array.from({ length: 8 }, (_, i) => ({
      path: `src/file-${i}.ts`,
      status: "unstaged" as const,
      kind: "modified" as const,
      hasUnstagedChanges: false,
    })),
    truncated: true,
  },
};
