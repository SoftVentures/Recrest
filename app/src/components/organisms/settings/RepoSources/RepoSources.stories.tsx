import type { Meta, StoryObj } from "@storybook/react-vite";

import { RepoSources } from "@/components/organisms/settings/RepoSources";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

const meta: Meta<typeof RepoSources> = {
  title: "Organisms/Settings/RepoSources",
  component: RepoSources,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <SettingsHarness>
        <Story />
      </SettingsHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof RepoSources> = {};
