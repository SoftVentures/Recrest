import type { Meta, StoryObj } from "@storybook/react-vite";

import FindAcrossReposDialog from "@/components/organisms/repos/FindAcrossReposDialog";

const meta: Meta<typeof FindAcrossReposDialog> = {
  title: "Organisms/Repos/FindAcrossReposDialog",
  component: FindAcrossReposDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    onClose: () => undefined,
    search: async (q) =>
      q.length < 2
        ? []
        : [
            {
              repoId: "demo-repo",
              repoName: "demo-repo",
              path: `src/util/${q}.ts`,
              line: 42,
              column: 1,
              snippet: `export function ${q}() { /* … */ }`,
            },
          ],
  },
};
export default meta;

type Story = StoryObj<typeof FindAcrossReposDialog>;
export const Empty: Story = {};
export const WithResults: Story = {
  args: {
    search: async () => [
      {
        repoId: "demo-repo",
        repoName: "demo-repo",
        path: "src/util/format.ts",
        line: 12,
        column: 1,
        snippet: "return value.toString();",
      },
      {
        repoId: "other-repo",
        repoName: "other-repo",
        path: "src/lib/git.ts",
        line: 88,
        column: 1,
        snippet: "const hash = revParse(ref);",
      },
    ],
  },
};
