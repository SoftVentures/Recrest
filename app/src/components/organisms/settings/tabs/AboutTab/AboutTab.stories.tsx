import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { AboutTabBody } from "@/components/organisms/settings/tabs/AboutTab";

const meta: Meta<typeof AboutTabBody> = {
  title: "Organisms/Settings/Tabs/AboutTab",
  component: AboutTabBody,
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

export const Default: StoryObj<typeof AboutTabBody> = {};
