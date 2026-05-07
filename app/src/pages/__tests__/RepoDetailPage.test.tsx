import { MemoryRouter, Route, Routes } from "react-router-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { AppRoute } from "@recrest/shared";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import "@/i18n";
import { RepoDetailPage } from "@/pages/RepoDetailPage";
import { store } from "@/store";
import { upsertConnection } from "@/store/slices/providersSlice";
import { setPrs } from "@/store/slices/prsSlice";
import { upsertRepo } from "@/store/slices/reposSlice";
import { makePullRequest, makeRepo } from "@/test-utils/fixtures";

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function mount(repoId: string) {
  return render(
    <Provider store={store}>
      <MemoryRouter future={ROUTER_FUTURE} initialEntries={[`/repo/${repoId}`]}>
        <TooltipProvider>
          <Routes>
            <Route path="/repo/:repoId" element={<RepoDetailPage />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("RepoDetailPage — Plan 1 §A.7 PR row click", () => {
  it("opens an inline drawer for the clicked PR without navigating away", () => {
    const repo = makeRepo({ id: "repo-detail-test", name: "test-repo", providerId: "github" });
    store.dispatch(upsertRepo(repo));
    store.dispatch(
      upsertConnection({
        providerId: "github",
        displayName: "GitHub",
        connected: true,
        username: "octocat",
        supportsOauth: false,
        baseUrl: "https://api.github.com",
      }),
    );
    const pr = makePullRequest({
      id: "pr-7",
      number: 7,
      title: "Refactor drawer envelope",
      author: "alice",
    });
    store.dispatch(setPrs({ repoId: repo.id, prs: [pr] }));

    navigateMock.mockClear();
    mount(repo.id);

    // The PR row exists and is the only button matching its title.
    const row = screen.getByText("Refactor drawer envelope").closest("button");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLButtonElement);

    // Drawer becomes visible and host page does NOT navigate to MR view.
    expect(screen.getByTestId("repo-detail-pr-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("mr-detail-panel")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith(AppRoute.MERGE_REQUESTS);
  });
});
