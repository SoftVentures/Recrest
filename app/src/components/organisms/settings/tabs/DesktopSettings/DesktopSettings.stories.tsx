import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DesktopSettings } from "@/components/organisms/settings/tabs/DesktopSettings";

const meta: Meta<typeof DesktopSettings> = {
  title: "Organisms/Settings/Tabs/DesktopSettings",
  component: DesktopSettings,
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

export const Default: StoryObj<typeof DesktopSettings> = {};
