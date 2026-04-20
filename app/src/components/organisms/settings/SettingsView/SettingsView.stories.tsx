import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsView } from "@/components/organisms/settings/SettingsView";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

const meta: Meta<typeof SettingsView> = {
  title: "Organisms/Settings/SettingsView",
  component: SettingsView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <SettingsHarness>
        <Story />
      </SettingsHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof SettingsView> = {};
