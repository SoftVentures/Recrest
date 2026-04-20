import { MemoryRouter } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { DetailPane } from "@/components/organisms/layout/DetailPane";
import "@/i18n";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function mount(repo = makeEnrichedRepo()) {
  return render(
    <Provider store={store}>
      <MemoryRouter future={ROUTER_FUTURE}>
        <TooltipProvider>
          <DetailPane repo={repo} onClose={() => {}} />
        </TooltipProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("DetailPane", () => {
  it("renders the repo name and path", () => {
    mount();
    expect(screen.getByText("recrest")).toBeInTheDocument();
    expect(screen.getByText("/Users/dev/code/recrest")).toBeInTheDocument();
  });

  it("renders the Pull / Fetch / Branch quick actions", () => {
    mount();
    expect(screen.getByRole("button", { name: /pull/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fetch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /branch/i })).toBeInTheDocument();
  });
});
