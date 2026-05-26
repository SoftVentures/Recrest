import { type ChangedFile, ChangedFileKind, ChangedFileStatus } from "@recrest/shared";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ChangedFilesList from "@/components/organisms/repos/ChangedFilesList";

const mk = (path: string, kind: ChangedFile["kind"]): ChangedFile => ({
  path,
  kind,
  status: ChangedFileStatus.UNSTAGED,
  hasUnstagedChanges: true,
});

const sample: ChangedFile[] = [
  mk("src/components/atoms/inputs/Kbd/index.tsx", ChangedFileKind.ADDED),
  mk("src/pages/app/Repos/components/RepoRow/index.tsx", ChangedFileKind.MODIFIED),
  mk("src/pages/app/Dashboard/parts/Kpi/index.tsx", ChangedFileKind.DELETED),
  mk("docs/plans/02-material-ui-migration.md", ChangedFileKind.MODIFIED),
  mk("shared/src/types/ide.ts", ChangedFileKind.RENAMED),
];

const meta: Meta<typeof ChangedFilesList> = {
  title: "Organisms/Repos/ChangedFilesList",
  component: ChangedFilesList,
  parameters: { layout: "padded" },
  args: { files: sample },
};
export default meta;

type Story = StoryObj<typeof ChangedFilesList>;
export const Default: Story = {};
export const Truncated: Story = { args: { truncated: true } };
export const Scrolling: Story = {
  args: {
    files: Array.from({ length: 24 }, (_, i) =>
      mk(
        `src/feature/file-${i}.ts`,
        i % 4 === 0
          ? ChangedFileKind.DELETED
          : i % 3 === 0
            ? ChangedFileKind.ADDED
            : ChangedFileKind.MODIFIED,
      ),
    ),
  },
};
