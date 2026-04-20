import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { SearchOverlay } from "@/components/organisms/search/SearchOverlay";
import { store } from "@/store";
import { setSearchOpen } from "@/store/slices/uiSlice";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const meta: Meta<typeof SearchOverlay> = {
  title: "Organisms/Search/SearchOverlay",
  component: SearchOverlay,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE}>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
};
export default meta;

export const Open: StoryObj<typeof SearchOverlay> = {
  render: () => {
    store.dispatch(setSearchOpen(true));
    return <SearchOverlay />;
  },
};

export const Closed: StoryObj<typeof SearchOverlay> = {
  render: () => {
    store.dispatch(setSearchOpen(false));
    return <SearchOverlay />;
  },
};
