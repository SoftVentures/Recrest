import { MemoryRouter } from "react-router-dom";

import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";

import { SearchOverlay } from "@/components/organisms/search/SearchOverlay";
import "@/i18n";
import { store } from "@/store";
import { setSearchOpen } from "@/store/slices/uiSlice";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

afterEach(() => {
  act(() => {
    store.dispatch(setSearchOpen(false));
  });
});

describe("SearchOverlay", () => {
  it("renders nothing while closed", () => {
    render(
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE}>
          <SearchOverlay />
        </MemoryRouter>
      </Provider>,
    );
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("opens when `ui.searchOpen` flips to true", () => {
    render(
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE}>
          <SearchOverlay />
        </MemoryRouter>
      </Provider>,
    );
    act(() => {
      store.dispatch(setSearchOpen(true));
    });
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });
});
