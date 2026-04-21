import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
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
          <TooltipProvider delayDuration={0}>
            <Sidebar />
          </TooltipProvider>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("nav-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("nav-repos")).toBeInTheDocument();
    expect(screen.getByTestId("nav-merge-requests")).toBeInTheDocument();
  });
});
