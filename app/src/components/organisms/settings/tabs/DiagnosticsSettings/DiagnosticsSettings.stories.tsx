import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DiagnosticsSettings } from "@/components/organisms/settings/tabs/DiagnosticsSettings";

const meta: Meta<typeof DiagnosticsSettings> = {
  title: "Organisms/Settings/Tabs/DiagnosticsSettings",
  component: DiagnosticsSettings,
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

export const Default: StoryObj<typeof DiagnosticsSettings> = {};
