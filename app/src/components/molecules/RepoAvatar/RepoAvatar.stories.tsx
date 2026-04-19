import type { Meta, StoryObj } from "@storybook/react-vite";

import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { sampleRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof RepoAvatar> = {
  title: "Molecules/RepoAvatar",
  component: RepoAvatar,
};

export default meta;

export const Default: StoryObj<typeof RepoAvatar> = {
  args: { repo: sampleRepo, size: 32, radius: 6 },
};
