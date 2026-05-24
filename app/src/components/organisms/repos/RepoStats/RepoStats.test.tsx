import { describe, expect, it } from "vitest";

import RepoStats from "@/components/organisms/repos/RepoStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { renderWithProviders } from "@/test/utils";

function makeRepo(overrides: Partial<EnrichedRepo> = {}): EnrichedRepo {
  return {
    id: "r1",
    name: "demo",
    path: "/tmp/demo",
    remoteUrl: null,
    provider: null,
    addedAt: "2026-01-01T00:00:00Z",
    isImported: false,
    customLogoPath: null,
    autoLogoLightPath: null,
    autoLogoDarkPath: null,
    metadata: null,
    enrichedAt: "2026-01-01T00:00:00Z",
    activity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    added: 4,
    removed: 2,
    filesChanged: 3,
    status: {
      branch: "main",
      head: null,
      ahead: 1,
      behind: 2,
      staged: 0,
      modified: 0,
      untracked: 0,
      deleted: 0,
      conflicted: 0,
      renamed: 0,
      dirty: false,
      lastCommit: null,
      changedFiles: [],
      changedFilesTruncated: false,
    },
    ...overrides,
  } as EnrichedRepo;
}

describe("RepoStats", () => {
  it("renders all 4 KPI slots when provider is connected", () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RepoStats
        repo={makeRepo()}
        totalCommits={8}
        maxBucket={3}
        openMrsCount={5}
        draftMrsCount={1}
      />,
    );
    expect(getByTestId(TEST_IDS.repoStats.root)).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoStats.aheadBehind)).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoStats.changedLines)).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoStats.commits14d)).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoStats.openMrs)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.repoStats.lastCommit)).toBeNull();
  });

  it("falls back to lastCommit KPI when no provider is connected", () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RepoStats
        repo={makeRepo()}
        totalCommits={8}
        maxBucket={3}
        openMrsCount={null}
        draftMrsCount={null}
      />,
    );
    expect(getByTestId(TEST_IDS.repoStats.lastCommit)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.repoStats.openMrs)).toBeNull();
  });
});
