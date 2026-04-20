import type { Meta, StoryObj } from "@storybook/react-vite";

import { PrRow } from "@/components/organisms/prs/PrRow";
import { makePullRequest } from "@/test-utils/fixtures";

const meta: Meta<typeof PrRow> = {
  title: "Organisms/PRs/PrRow",
  component: PrRow,
  parameters: { layout: "padded" },
};
export default meta;

export const Default: StoryObj<typeof PrRow> = {
  args: { pr: makePullRequest(), repoName: "recrest" },
};

export const Draft: StoryObj<typeof PrRow> = {
  args: { pr: makePullRequest({ draft: true }), repoName: "recrest" },
};

export const Passing: StoryObj<typeof PrRow> = {
  args: {
    pr: makePullRequest({ ciStatus: "success" }),
    repoName: "recrest",
  },
};

export const Failing: StoryObj<typeof PrRow> = {
  args: {
    pr: makePullRequest({ ciStatus: "failure" }),
    repoName: "recrest",
  },
};
