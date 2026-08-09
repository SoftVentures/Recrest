import { Route, Routes } from "react-router-dom";

import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { type PullRequestDetail, TauriCommand } from "@recrest/shared";

import { screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import MrDetailPage from "@/pages/app/MrDetail";
import { detailKey } from "@/store/actions/prs.actions";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";
const REPO_ID = "repo-1";
const PR_NUMBER = 42;
const ROUTE_PATH = "/merge-requests/:repoId/:prNumber";
const KEY = detailKey(REPO_ID, PR_NUMBER);

beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});
afterEach(() => {
  vi.mocked(mockedInvoke).mockReset();
});

function prDetail(): PullRequestDetail {
  return {
    id: `pr-${PR_NUMBER}`,
    number: PR_NUMBER,
    title: "Deep linked merge request",
    url: "https://example.com/pr/42",
    author: "alice",
    state: "open",
    draft: false,
    sourceBranch: "feature",
    targetBranch: "main",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    additions: 3,
    deletions: 1,
    ciStatus: null,
    body: "Body text",
    mergeable: true,
    reviewers: [],
    files: [],
    timeline: [],
  };
}

function renderDetail(store = makeTestStore()) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<MrDetailPage />} />
    </Routes>,
    { store, route: `/merge-requests/${REPO_ID}/${PR_NUMBER}` },
  );
}

describe("MrDetailPage loading vs. not-found", () => {
  it("shows the loading state while the detail fetch is still in flight", async () => {
    // A deep link lands with an empty PR list and a fetch that hasn't answered.
    vi.mocked(mockedInvoke).mockReturnValue(new Promise(() => {}));
    renderDetail();

    expect(await screen.findByTestId(TEST_IDS.mr.detailLoading)).toBeTruthy();
    expect(screen.queryByTestId(TEST_IDS.emptyState)).toBeNull();
  });

  it("keeps showing the loading state before the fetch has even started", () => {
    vi.mocked(mockedInvoke).mockReturnValue(new Promise(() => {}));
    const store = makeTestStore({ prs: { detailLoading: {} } });
    renderDetail(store);

    // First paint, `loadPrDetail.pending` not dispatched yet — still not a miss.
    expect(screen.queryByTestId(TEST_IDS.emptyState)).toBeNull();
    expect(screen.getByTestId(TEST_IDS.mr.detailLoading)).toBeTruthy();
  });

  it("renders the merge request from the detail fetch when the list never loaded", async () => {
    vi.mocked(mockedInvoke).mockImplementation((command: string) => {
      if (command === TauriCommand.GET_PR_DETAIL) return Promise.resolve(prDetail());
      return Promise.resolve([]);
    });
    renderDetail();

    expect(await screen.findByTestId(TEST_IDS.mr.mergeBtn)).toBeTruthy();
    expect(screen.queryByTestId(TEST_IDS.mr.detailLoading)).toBeNull();
    expect(screen.queryByTestId(TEST_IDS.emptyState)).toBeNull();
  });

  it("falls through to not-found once the detail fetch settled empty", async () => {
    vi.mocked(mockedInvoke).mockRejectedValue(new Error("no such merge request"));
    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.emptyState)).toBeTruthy();
    });
    expect(screen.queryByTestId(TEST_IDS.mr.detailLoading)).toBeNull();
  });

  it("renders the merge request straight from the cached list without loading", () => {
    vi.mocked(mockedInvoke).mockReturnValue(new Promise(() => {}));
    const store = makeTestStore({
      prs: { items: { [REPO_ID]: [prDetail()] }, detailLoading: { [KEY]: true } },
    });
    renderDetail(store);

    expect(screen.getByTestId(TEST_IDS.mr.mergeBtn)).toBeTruthy();
    expect(screen.queryByTestId(TEST_IDS.mr.detailLoading)).toBeNull();
  });
});
