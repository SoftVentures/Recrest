import type { Meta, StoryObj } from "@storybook/react-vite";

import { Timeline } from "@/components/organisms/activity/Timeline";
import {
  fakeCheckRun,
  fakeCommit,
  fakePrEvent,
  fakeRepo,
} from "@/components/organisms/activity/cards/_fixtures";
import { startOfLocalDay } from "@/lib/activityStats";

const today = startOfLocalDay(new Date());

const meta: Meta<typeof Timeline> = {
  title: "Organisms/Activity/Timeline",
  component: Timeline,
};
export default meta;

export const Default: StoryObj<typeof Timeline> = {
  args: {
    today,
    reposById: new Map([
      ["r1", fakeRepo("r1", { name: "recrest" })],
      ["r2", fakeRepo("r2", { name: "landing" })],
    ]),
    commits: [
      fakeCommit("abc1234", "r1", "alice", today.toISOString()),
      fakeCommit("def5678", "r2", "bob", new Date(today.getTime() - 86_400_000).toISOString()),
    ],
    prEvents: [
      fakePrEvent("merged", { repoId: "r1", repoName: "recrest", timestamp: today.toISOString() }),
    ],
    checkRuns: [fakeCheckRun({ repoId: "r1", repoName: "recrest", failed: 1 })],
  },
};

export const Empty: StoryObj<typeof Timeline> = {
  args: {
    today,
    reposById: new Map(),
    commits: [],
    prEvents: [],
    checkRuns: [],
  },
};
