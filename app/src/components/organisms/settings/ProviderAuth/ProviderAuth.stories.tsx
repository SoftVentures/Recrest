import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProviderAuth } from "@/components/organisms/settings/ProviderAuth";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

const meta: Meta<typeof ProviderAuth> = {
  title: "Organisms/Settings/ProviderAuth",
  component: ProviderAuth,
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

export const Default: StoryObj<typeof ProviderAuth> = {};
