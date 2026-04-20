import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { Header } from "@/components/organisms/layout/Header";
import "@/i18n";
import { store } from "@/store";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function renderAt(path: string) {
  return render(
    <Provider store={store}>
      <MemoryRouter future={ROUTER_FUTURE} initialEntries={[path]}>
        <TooltipProvider>
          <Header />
        </TooltipProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("Header", () => {
  it("renders search trigger + refresh + add repo", () => {
    renderAt("/dashboard");
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/refresh/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/add repo/i)).toBeInTheDocument();
  });

  it("picks a dashboard title on /dashboard", () => {
    renderAt("/dashboard");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/dashboard/i);
  });

  it("picks an activity title on /activity", () => {
    renderAt("/activity");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/activity/i);
  });
});
