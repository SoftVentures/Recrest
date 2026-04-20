import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { UpdatesSettings } from "@/components/organisms/settings/tabs/UpdatesSettings";

const meta: Meta<typeof UpdatesSettings> = {
  title: "Organisms/Settings/Tabs/UpdatesSettings",
  component: UpdatesSettings,
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

export const Default: StoryObj<typeof UpdatesSettings> = {};
