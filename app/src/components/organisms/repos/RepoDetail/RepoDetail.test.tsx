import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { RepoDetail } from "@/components/organisms/repos/RepoDetail";
import "@/i18n";
import { store } from "@/store";
import { makeRepo } from "@/test-utils/fixtures";

function mount() {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <RepoDetail repo={makeRepo()} />
      </TooltipProvider>
    </Provider>,
  );
}

describe("RepoDetail", () => {
  it("renders the repo name and path", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("recrest");
    expect(screen.getByText("/Users/dev/code/recrest")).toBeInTheDocument();
  });

  it("renders a Branch / Changes / Last commit stat grid", () => {
    mount();
    expect(screen.getByText(/branch/i)).toBeInTheDocument();
    expect(screen.getByText(/last commit/i)).toBeInTheDocument();
  });
});
