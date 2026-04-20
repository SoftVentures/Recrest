import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { Sidebar } from "@/components/organisms/layout/Sidebar";
import { store } from "@/store";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const meta: Meta<typeof Sidebar> = {
  title: "Organisms/Layout/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE} initialEntries={["/dashboard"]}>
          <div style={{ height: "100vh", display: "flex" }}>
            <Story />
          </div>
        </MemoryRouter>
      </Provider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof Sidebar> = {};
