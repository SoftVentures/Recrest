import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "@/components/atoms/Separator";

const meta: Meta<typeof Separator> = {
  title: "Atoms/Separator",
  component: Separator,
};

export default meta;

export const Horizontal: StoryObj<typeof Separator> = {};
export const Vertical: StoryObj<typeof Separator> = {
  args: { orientation: "vertical" },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", height: 40, alignItems: "stretch" }}>
        <span style={{ padding: "0 12px" }}>Left</span>
        <Story />
        <span style={{ padding: "0 12px" }}>Right</span>
      </div>
    ),
  ],
};
