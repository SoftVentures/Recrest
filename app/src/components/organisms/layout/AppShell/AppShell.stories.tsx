import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { AppShell } from "@/components/organisms/layout/AppShell";
import { store } from "@/store";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const meta: Meta<typeof AppShell> = {
  title: "Organisms/Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE} initialEntries={["/dashboard"]}>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof AppShell> = {
  args: {
    children: <div style={{ padding: 24 }}>Page content goes here.</div>,
  },
};
