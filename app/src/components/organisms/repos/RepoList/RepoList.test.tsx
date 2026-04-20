import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { RepoList } from "@/components/organisms/repos/RepoList";
import "@/i18n";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

function mount(repos = [makeEnrichedRepo()]) {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <RepoList repos={repos} grouped={false} />
      </TooltipProvider>
    </Provider>,
  );
}

describe("RepoList", () => {
  it("renders the column headers", () => {
    mount();
    expect(screen.getByText(/repository/i)).toBeInTheDocument();
    expect(screen.getByText(/branch/i)).toBeInTheDocument();
  });

  it("renders one row per repo", () => {
    mount([
      makeEnrichedRepo({ id: "r1", name: "one" }),
      makeEnrichedRepo({ id: "r2", name: "two" }),
    ]);
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });

  it("shows an empty-state when the list is empty", () => {
    mount([]);
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });
});
