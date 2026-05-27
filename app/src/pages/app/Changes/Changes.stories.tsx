import { Provider as ReduxProvider } from "react-redux";

import { configureStore } from "@reduxjs/toolkit";

import { ChangedFileKind, ChangedFileStatus, type Repository } from "@recrest/shared";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ChangesPage from "@/pages/app/Changes";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";

function makeRepo(
  id: string,
  name: string,
  overrides: Partial<Repository["status"]> = {},
): Repository {
  return {
    id,
    name,
    path: `/Users/dev/${name}`,
    groupId: null,
    remoteUrl: `https://github.com/example/${name}`,
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    status: {
      branch: "main",
      head: "abc1234",
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      dirty: true,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [
        {
          path: "src/app.ts",
          status: ChangedFileStatus.UNSTAGED,
          kind: ChangedFileKind.MODIFIED,
          hasUnstagedChanges: true,
        },
        {
          path: "README.md",
          status: ChangedFileStatus.STAGED,
          kind: ChangedFileKind.ADDED,
          hasUnstagedChanges: false,
        },
      ],
      changedFilesTruncated: false,
      commitActivity: [],
      addedLines: 84,
      removedLines: 12,
      language: "TypeScript",
      languages: null,
      ...overrides,
    },
  };
}

function storeWith(repos: Repository[]) {
  return configureStore({
    reducer: {
      ui: uiReducer,
      settings: settingsReducer,
      providers: providersReducer,
      repos: reposReducer,
      prs: prsReducer,
      remoteImport: remoteImportReducer,
    },
    preloadedState: {
      repos: {
        items: Object.fromEntries(repos.map((r) => [r.id, r])),
        groups: {},
        scanPaths: [],
        loading: false,
        error: null,
      },
    },
  });
}

const populated = storeWith([
  makeRepo("a", "recrest"),
  makeRepo("b", "design-system", { addedLines: 3, removedLines: 0 }),
]);
const empty = storeWith([]);

const meta: Meta<typeof ChangesPage> = {
  title: "Pages/Changes",
  component: ChangesPage,
  parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof ChangesPage>;

export const WithChanges: Story = {
  decorators: [
    (Story) => (
      <ReduxProvider store={populated}>
        <Story />
      </ReduxProvider>
    ),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <ReduxProvider store={empty}>
        <Story />
      </ReduxProvider>
    ),
  ],
};
