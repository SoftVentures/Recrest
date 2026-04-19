import type { Meta, StoryObj } from "@storybook/react-vite";

import { InfoHint } from "@/components/molecules/InfoHint";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

const meta: Meta<typeof InfoHint> = {
  title: "Molecules/InfoHint",
  component: InfoHint,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="p-8">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;

export const Default: StoryObj<typeof InfoHint> = {
  args: { children: "Extra context shown on hover." },
};
export const LongText: StoryObj<typeof InfoHint> = {
  args: {
    children:
      "Personal access tokens with repo scope are required so Recrest can list private pull requests on your behalf. Tokens are stored in the OS keychain.",
  },
};
export const CustomLabel: StoryObj<typeof InfoHint> = {
  args: { children: "Only stored locally.", label: "Privacy note" },
};
export const RightSide: StoryObj<typeof InfoHint> = {
  args: { children: "Opens to the right.", side: "right" },
};
