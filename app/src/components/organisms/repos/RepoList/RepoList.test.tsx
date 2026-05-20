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
    // D.1: only the active layout is rendered. In jsdom the container has
    // 0 width so the auto-card branch never kicks in (ResizeObserver
    // notifications don't fire under jsdom), and we end up in the table
    // layout — exactly one occurrence of each repo name.
    expect(screen.getAllByText("one")).toHaveLength(1);
    expect(screen.getAllByText("two")).toHaveLength(1);
  });

  it("shows an empty-state when the list is empty", () => {
    mount([]);
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it("renders only the table layout by default (no duplicated card grid)", () => {
    const { container } = mount([makeEnrichedRepo({ id: "r1", name: "single" })]);
    // I2: the JSX renders a single layout — the table is present, the card
    // grid is not. The CSS `@container` fallback can still flip visibility
    // at runtime, but we should not double-render the DOM tree.
    expect(container.querySelector("[data-testid='repo-card-grid']")).toBeNull();
    expect(container.querySelector(".repo-list-table")).not.toBeNull();
  });

  it("flips to the card grid when the user picks card view", () => {
    render(
      <Provider store={store}>
        <TooltipProvider>
          <RepoList repos={[makeEnrichedRepo({ id: "r1" })]} viewMode="card" />
        </TooltipProvider>
      </Provider>,
    );
    expect(screen.getByTestId("repo-card-grid")).toBeInTheDocument();
    expect(document.querySelector(".repo-list-table")).toBeNull();
  });
});
