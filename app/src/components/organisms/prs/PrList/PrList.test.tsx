import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";

import { PrList } from "@/components/organisms/prs/PrList";
import "@/i18n";
import { store } from "@/store";
import { setPrs } from "@/store/slices/prsSlice";
import { upsertRepo } from "@/store/slices/reposSlice";
import { makePullRequest, sampleRepo } from "@/test-utils/fixtures";

afterEach(() => {
  act(() => {
    store.dispatch(setPrs({ repoId: sampleRepo.id, prs: [] }));
  });
});

describe("PrList", () => {
  it("shows the empty-state when there are no PRs", () => {
    render(
      <Provider store={store}>
        <PrList />
      </Provider>,
    );
    expect(screen.getByText(/no open/i)).toBeInTheDocument();
  });

  it("renders one row per open PR", () => {
    act(() => {
      store.dispatch(upsertRepo(sampleRepo));
      store.dispatch(
        setPrs({
          repoId: sampleRepo.id,
          prs: [
            makePullRequest({ id: "1", number: 1, title: "first" }),
            makePullRequest({ id: "2", number: 2, title: "second" }),
          ],
        }),
      );
    });
    render(
      <Provider store={store}>
        <PrList />
      </Provider>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
