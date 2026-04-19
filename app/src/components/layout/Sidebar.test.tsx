import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import "@/i18n";
import { store } from "@/store";

import { Sidebar } from "./Sidebar";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe("Sidebar", () => {
  it("renders primary nav items", () => {
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
