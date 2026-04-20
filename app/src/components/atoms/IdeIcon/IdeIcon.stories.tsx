import type { Meta, StoryObj } from "@storybook/react-vite";

import { IdeIcon } from "@/components/atoms/IdeIcon";

const meta: Meta<typeof IdeIcon> = {
  title: "Atoms/IdeIcon",
  component: IdeIcon,
  args: { size: 32, color: "brand" },
};

export default meta;

export const VsCode: StoryObj<typeof IdeIcon> = { args: { id: "vscode" } };
export const VsCodeInsiders: StoryObj<typeof IdeIcon> = {
  args: { id: "vscode-insiders" },
};
export const Cursor: StoryObj<typeof IdeIcon> = { args: { id: "cursor" } };
export const WebStorm: StoryObj<typeof IdeIcon> = { args: { id: "webstorm" } };
export const IntelliJIDEA: StoryObj<typeof IdeIcon> = { args: { id: "idea" } };
export const JetBrainsToolbox: StoryObj<typeof IdeIcon> = {
  args: { id: "jetbrains-toolbox" },
};
export const Disabled: StoryObj<typeof IdeIcon> = {
  args: { id: "webstorm", color: "currentColor" },
};
