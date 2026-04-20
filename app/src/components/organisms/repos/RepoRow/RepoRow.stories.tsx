import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { COL_TEMPLATE, RepoRow } from "@/components/organisms/repos/RepoRow";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof RepoRow> = {
  title: "Organisms/Repos/RepoRow",
  component: RepoRow,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <TooltipProvider>
          <div className="a-table" style={{ width: 900 }}>
            <div className="a-thead" style={{ gridTemplateColumns: COL_TEMPLATE }}>
              <div className="a-th">Repository</div>
              <div className="a-th">Branch</div>
              <div className="a-th">Status</div>
              <div className="a-th">Activity</div>
              <div className="a-th r">Actions</div>
            </div>
            <Story />
          </div>
        </TooltipProvider>
      </Provider>
    ),
  ],
};
export default meta;

export const Clean: StoryObj<typeof RepoRow> = {
  args: { repo: makeEnrichedRepo(), onSelect: () => {}, selected: false },
};

export const Dirty: StoryObj<typeof RepoRow> = {
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
        lastCommit: null,
        remoteUrl: null,
        changedFiles: [],
        changedFilesTruncated: false,
        commitActivity: Array.from({ length: 14 }, () => Math.floor(Math.random() * 4)),
        addedLines: 280,
        removedLines: 120,
        language: "TypeScript",
        languages: { TypeScript: 520_000, CSS: 84_000, HTML: 16_000 },
      },
    }),
    onSelect: () => {},
    selected: false,
  },
};

export const Selected: StoryObj<typeof RepoRow> = {
  args: { repo: makeEnrichedRepo(), onSelect: () => {}, selected: true },
};
