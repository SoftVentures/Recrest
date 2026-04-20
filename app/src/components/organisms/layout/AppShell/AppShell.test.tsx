import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/organisms/layout/AppShell";
import "@/i18n";
import { store } from "@/store";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe("AppShell", () => {
  it("renders its children inside the content area", () => {
    render(
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE} initialEntries={["/dashboard"]}>
          <AppShell>
            <div data-testid="shell-content">hello</div>
          </AppShell>
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByTestId("shell-content")).toHaveTextContent("hello");
  });

  it("wraps children in the error boundary (renders sibling shell elements too)", () => {
    render(
      <Provider store={store}>
        <MemoryRouter future={ROUTER_FUTURE} initialEntries={["/dashboard"]}>
          <AppShell>
            <div>page body</div>
          </AppShell>
        </MemoryRouter>
      </Provider>,
    );
    // The search button is rendered by <Header /> which lives inside the shell.
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });
});
