import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { AppearanceSettings } from "@/components/organisms/settings/tabs/AppearanceSettings";

const meta: Meta<typeof AppearanceSettings> = {
  title: "Organisms/Settings/Tabs/AppearanceSettings",
  component: AppearanceSettings,
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

export const Default: StoryObj<typeof AppearanceSettings> = {};
