import type { Meta, StoryObj } from "@storybook/react-vite";

import { InfoHint } from "@/components/molecules/InfoHint";

const meta: Meta<typeof InfoHint> = {
  title: "Molecules/InfoHint",
  component: InfoHint,
};

export default meta;

export const Default: StoryObj<typeof InfoHint> = {
  args: { children: "Extra context shown on hover." },
};
