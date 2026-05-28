import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import type { Repository } from "@recrest/shared";

import { fireEvent, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import ReposPage from "@/pages/app/Repos";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";
beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});

function makeRepo(id: string, name: string, group: string): Repository {
  return {
    id,
    name,
    path: `/parent/${group}/${name}`,
    groupId: group,
    remoteUrl: null,
    providerId: null,
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: {
      branch: "main",
      head: "abc",
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      dirty: false,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [],
      changedFilesTruncated: false,
      commitActivity: Array(14).fill(0) as number[],
      addedLines: 0,
      removedLines: 0,
      language: null,
      languages: null,
    },
  } as unknown as Repository;
}

describe("ReposPage group filter", () => {
  it("filters the list to only the repos in the selected group", () => {
    // Repos/groups come from the preloaded store; any IPC the page kicks off
    // on mount (loadRepos, etc.) should resolve harmlessly.
    vi.mocked(mockedInvoke).mockResolvedValue([]);
    const a = makeRepo("a", "alpha", "AcmeGroup");
    const b = makeRepo("b", "beta", "OtherGroup");
    const store = makeTestStore({
      repos: {
        items: { a, b },
        groups: {
          AcmeGroup: { id: "AcmeGroup", name: "AcmeGroup", color: "#888888" },
          OtherGroup: { id: "OtherGroup", name: "OtherGroup", color: "#888888" },
        },
      },
    });

    renderWithProviders(<ReposPage />, { store });

    // Open filter menu, pick AcmeGroup.
    fireEvent.click(screen.getByTestId(TEST_IDS.repos.filterTrigger));
    fireEvent.click(screen.getByTestId(TEST_IDS.repos.filterGroupOption("AcmeGroup")));

    const list = screen.getByTestId(TEST_IDS.repos.list);
    expect(within(list).getByText("alpha")).toBeTruthy();
    expect(within(list).queryByText("beta")).toBeNull();
  });
});
