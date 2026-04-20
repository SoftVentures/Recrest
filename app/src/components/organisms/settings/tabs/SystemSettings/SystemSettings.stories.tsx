import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { SystemSettings } from "@/components/organisms/settings/tabs/SystemSettings";

const meta: Meta<typeof SystemSettings> = {
  title: "Organisms/Settings/Tabs/SystemSettings",
  component: SystemSettings,
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

export const Default: StoryObj<typeof SystemSettings> = {};
