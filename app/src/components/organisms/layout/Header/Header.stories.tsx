import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { Header } from "@/components/organisms/layout/Header";
import { store } from "@/store";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const meta: Meta<typeof Header> = {
  title: "Organisms/Layout/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
};
export default meta;

function wrap(initial: string) {
  return (
    <Provider store={store}>
      <MemoryRouter future={ROUTER_FUTURE} initialEntries={[initial]}>
        <TooltipProvider>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <Header />
          </div>
        </TooltipProvider>
      </MemoryRouter>
    </Provider>
  );
}

export const Dashboard: StoryObj<typeof Header> = { render: () => wrap("/dashboard") };
export const Activity: StoryObj<typeof Header> = { render: () => wrap("/activity") };
export const Settings: StoryObj<typeof Header> = { render: () => wrap("/settings") };
