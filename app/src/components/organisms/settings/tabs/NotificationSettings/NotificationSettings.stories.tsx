import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { NotificationSettings } from "@/components/organisms/settings/tabs/NotificationSettings";

const meta: Meta<typeof NotificationSettings> = {
  title: "Organisms/Settings/Tabs/NotificationSettings",
  component: NotificationSettings,
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

export const Default: StoryObj<typeof NotificationSettings> = {};
