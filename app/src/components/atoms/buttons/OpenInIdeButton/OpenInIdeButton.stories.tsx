import type { Meta, StoryObj } from "@storybook/react-vite";

import OpenInIdeButton, { OpenInIdeVariant } from "@/components/atoms/buttons/OpenInIdeButton";

const meta: Meta<typeof OpenInIdeButton> = {
  title: "Atoms/Buttons/OpenInIdeButton",
  component: OpenInIdeButton,
  parameters: { layout: "centered" },
  args: { repoId: "demo-repo" },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: [OpenInIdeVariant.ICON, OpenInIdeVariant.BUTTON],
    },
    ideId: {
      control: { type: "select" },
      options: ["vscode", "vscode-insiders", "cursor", "webstorm", "idea", "jetbrains-toolbox"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof OpenInIdeButton>;

export const Icon: Story = { args: { variant: OpenInIdeVariant.ICON } };
export const Button: Story = { args: { variant: OpenInIdeVariant.BUTTON } };
export const IntelliJ: Story = {
  args: { variant: OpenInIdeVariant.BUTTON, ideId: "idea" },
};
