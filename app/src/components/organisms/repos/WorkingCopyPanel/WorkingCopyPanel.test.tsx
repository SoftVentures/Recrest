import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { ChangedFileKind, ChangedFileStatus, type Repository, TauriCommand } from "@recrest/shared";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import WorkingCopyPanel from "@/components/organisms/repos/WorkingCopyPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { makeTestStore, renderWithProviders } from "@/test/utils";

// The Tauri wrapper short-circuits with a rejection unless this marker exists
// on window. Stub it for the whole file so the wrapper forwards through to
// the mocked `tauriInvoke`.
const TAURI_MARKER = "__TAURI_INTERNALS__";
beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: "r1",
    name: "demo",
    path: "/tmp/demo",
    addedAt: new Date(0).toISOString(),
    providerId: null,
    sshKeyPath: null,
    groupId: null,
    bookmarked: false,
    status: {
      branch: "main",
      head: "abc123",
      ahead: 0,
      behind: 0,
      staged: 1,
      unstaged: 1,
      untracked: 0,
      conflicted: 0,
      dirty: true,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [
        {
          path: "src/a.ts",
          status: ChangedFileStatus.STAGED,
          kind: ChangedFileKind.MODIFIED,
          hasUnstagedChanges: false,
        },
        {
          path: "src/b.ts",
          status: ChangedFileStatus.UNSTAGED,
          kind: ChangedFileKind.MODIFIED,
          hasUnstagedChanges: false,
        },
      ],
      changedFilesTruncated: false,
      commitActivity: Array(14).fill(0) as number[],
      addedLines: 0,
      removedLines: 0,
      language: null,
      languages: null,
    },
    ...overrides,
  } as unknown as Repository;
}

describe("WorkingCopyPanel", () => {
  it("renders staged + unstaged sections with the rows from the store", () => {
    const repo = makeRepo();
    const store = makeTestStore({ repos: { items: { [repo.id]: repo } } });

    const { getByTestId } = renderWithProviders(<WorkingCopyPanel repoId={repo.id} />, { store });

    expect(getByTestId(TEST_IDS.workingCopy.root)).toBeTruthy();
    expect(getByTestId(TEST_IDS.workingCopy.section("staged"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.workingCopy.section("unstaged"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.workingCopy.row("staged", "src/a.ts"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.workingCopy.row("unstaged", "src/b.ts"))).toBeTruthy();
  });

  it("dispatches GIT_STAGE when an unstaged row's Stage button is clicked", async () => {
    const repo = makeRepo();
    const store = makeTestStore({ repos: { items: { [repo.id]: repo } } });

    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    // The panel calls GIT_STASH_LIST on mount; resolve it harmlessly.
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.GIT_STASH_LIST) return [];
      return repo.status;
    });

    const { getByTestId } = renderWithProviders(<WorkingCopyPanel repoId={repo.id} />, { store });
    getByTestId(TEST_IDS.workingCopy.stageRow("src/b.ts")).click();

    // Yield a microtask so the thunk's invoke promise settles.
    await Promise.resolve();
    await Promise.resolve();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.GIT_STAGE, {
      repoId: repo.id,
      paths: ["src/b.ts"],
    });
  });

  it("shows a file with hasUnstagedChanges in BOTH sections (git status parity)", () => {
    const repo = makeRepo({
      status: {
        ...makeRepo().status,
        changedFiles: [
          {
            path: "src/dual.ts",
            status: ChangedFileStatus.STAGED,
            kind: ChangedFileKind.MODIFIED,
            hasUnstagedChanges: true,
          },
        ],
      },
    } as Partial<Repository>);
    const store = makeTestStore({ repos: { items: { [repo.id]: repo } } });

    const { getByTestId } = renderWithProviders(<WorkingCopyPanel repoId={repo.id} />, { store });

    // Same path renders once per section under distinct testids.
    expect(getByTestId(TEST_IDS.workingCopy.row("staged", "src/dual.ts"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.workingCopy.row("unstaged", "src/dual.ts"))).toBeTruthy();
  });

  it("interpolates the stash index instead of rendering the raw template", async () => {
    const repo = makeRepo();
    const store = makeTestStore({ repos: { items: { [repo.id]: repo } } });

    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.GIT_STASH_LIST) {
        return [
          { index: 0, message: "WIP on main", oid: "aaa" },
          { index: 1, message: "WIP on feature", oid: "bbb" },
        ];
      }
      return repo.status;
    });

    const { findByTestId } = renderWithProviders(<WorkingCopyPanel repoId={repo.id} />, { store });

    const first = await findByTestId(TEST_IDS.workingCopy.stashIndex(0));
    const second = await findByTestId(TEST_IDS.workingCopy.stashIndex(1));

    expect(first.textContent).toBe("stash@{0}");
    expect(second.textContent).toBe("stash@{1}");
    expect(first.textContent).not.toContain("{{");
  });
});
