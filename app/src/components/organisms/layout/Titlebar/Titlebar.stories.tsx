import type { Meta, StoryObj } from "@storybook/react-vite";

import { GnomeTitlebar } from "@/components/organisms/layout/Titlebar/GnomeTitlebar";
import { MacOverlayTitlebar } from "@/components/organisms/layout/Titlebar/MacOverlayTitlebar";
import { Win11Titlebar } from "@/components/organisms/layout/Titlebar/Win11Titlebar";

// Storybook runs outside of Tauri, so `<Titlebar />` itself would render null.
// The per-chrome components are shown directly so each variant is reviewable.
const meta: Meta = {
  title: "Organisms/Layout/Titlebar",
  parameters: { layout: "fullscreen" },
};
export default meta;

export const MacOverlay: StoryObj = { render: () => <MacOverlayTitlebar /> };
export const Gnome: StoryObj = { render: () => <GnomeTitlebar /> };
export const Win11Restored: StoryObj = {
  render: () => <Win11Titlebar isMaximized={false} />,
};
export const Win11Maximized: StoryObj = {
  render: () => <Win11Titlebar isMaximized />,
};
