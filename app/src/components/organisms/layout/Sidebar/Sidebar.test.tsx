import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { Sidebar } from "@/components/organisms/layout/Sidebar";
import "@/i18n";
import { store } from "@/store";
import { upsertConnection } from "@/store/slices/providersSlice";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe("Sidebar", () => {
  it("renders primary nav items", () => {
    // Merge requests are hidden until a provider is connected.
    store.dispatch(
      upsertConnection({
        providerId: "github",
        displayName: "GitHub",
        connected: true,
        username: "test",
        supportsOauth: false,
        baseUrl: null,
      }),
    );

    render(
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE}>
          <Sidebar />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByRole("navigation", { hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/repositories/i)).toBeInTheDocument();
    expect(screen.getByText(/merge requests/i)).toBeInTheDocument();
  });
});
