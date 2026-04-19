import type { Meta, StoryObj } from "@storybook/react-vite";

import { ExternalLinkButton } from "@/components/molecules/ExternalLinkButton";

const meta: Meta<typeof ExternalLinkButton> = {
  title: "Molecules/ExternalLinkButton",
  component: ExternalLinkButton,
};

export default meta;

export const WithLabel: StoryObj<typeof ExternalLinkButton> = {
  args: { url: "https://github.com/SoftVentures/Recrest", label: "Open on GitHub" },
};

export const IconOnly: StoryObj<typeof ExternalLinkButton> = {
  args: { url: "https://github.com/SoftVentures/Recrest", iconOnly: true, title: "Open on GitHub" },
};

export const Small: StoryObj<typeof ExternalLinkButton> = {
  args: { url: "https://github.com/SoftVentures/Recrest", label: "Source", size: "sm" },
};
