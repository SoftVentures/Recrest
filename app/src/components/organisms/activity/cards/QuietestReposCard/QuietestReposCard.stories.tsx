import type { Meta, StoryObj } from "@storybook/react-vite";

import { QuietestReposCard } from "@/components/organisms/activity/cards/QuietestReposCard";
import { fakeRepo } from "@/components/organisms/activity/cards/_fixtures";

const reposById = new Map([
  ["r1", fakeRepo("r1", { name: "sleepy-svc" })],
  ["r2", fakeRepo("r2", { name: "infra-archive" })],
  ["r3", fakeRepo("r3", { name: "legacy-api" })],
]);

const meta: Meta<typeof QuietestReposCard> = {
  title: "Organisms/Activity/QuietestReposCard",
  component: QuietestReposCard,
};
export default meta;

export const Default: StoryObj<typeof QuietestReposCard> = {
  args: { quietestRepoIds: ["r1", "r2", "r3"], reposById },
};

export const Empty: StoryObj<typeof QuietestReposCard> = {
  args: { quietestRepoIds: [], reposById: new Map() },
};
