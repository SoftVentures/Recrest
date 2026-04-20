import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { RepoStats } from "@/components/organisms/repos/RepoStats";
import "@/i18n";
import { store } from "@/store";
import { makeRepo } from "@/test-utils/fixtures";

describe("RepoStats", () => {
  it("renders the total repo count", () => {
    render(
      <Provider store={store}>
        <RepoStats repos={[makeRepo({ id: "a" }), makeRepo({ id: "b" })]} />
      </Provider>,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("counts dirty repos separately", () => {
    render(
      <Provider store={store}>
        <RepoStats
          repos={[
            makeRepo({ id: "a", status: { ...makeRepo().status, dirty: true } }),
            makeRepo({ id: "b" }),
          ]}
        />
      </Provider>,
    );
    // One dirty, one total=2
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
