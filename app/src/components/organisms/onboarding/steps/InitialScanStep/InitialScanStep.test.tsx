import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import type { Repository } from "@recrest/shared";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import InitialScanStep from "@/components/organisms/onboarding/steps/InitialScanStep";
import i18n from "@/locales";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";

beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});

afterEach(() => {
  vi.mocked(mockedInvoke).mockReset();
});

function makeRepo(id: string): Repository {
  return {
    id,
    name: id,
    path: `/tmp/${id}`,
    groupId: null,
    remoteUrl: null,
    providerId: null,
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: {
      branch: "main",
      head: null,
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
  } as Repository;
}

async function renderScanWith(opts: { repoCount: number; pathCount: number; lng: "en" | "de" }) {
  await i18n.changeLanguage(opts.lng);
  const repos = Array.from({ length: opts.repoCount }, (_, i) => makeRepo(`r${i + 1}`));
  vi.mocked(mockedInvoke).mockResolvedValue(repos);
  const store = makeTestStore({
    repos: {
      items: {},
      scanPaths: Array.from({ length: opts.pathCount }, (_, i) => `/tmp/p${i + 1}`),
    },
  });
  return renderWithProviders(<InitialScanStep onBack={() => {}} onNext={() => {}} />, { store });
}

describe("InitialScanStep summary composition (DE)", () => {
  it("renders singular repo and singular path: '1 Repository in 1 Ordner gefunden.'", async () => {
    const { findByText } = await renderScanWith({ repoCount: 1, pathCount: 1, lng: "de" });
    expect(await findByText("1 Repository in 1 Ordner gefunden.")).toBeInTheDocument();
  });

  it("renders plural repos and singular path: '8 Repositories in 1 Ordner gefunden.'", async () => {
    const { findByText } = await renderScanWith({ repoCount: 8, pathCount: 1, lng: "de" });
    expect(await findByText("8 Repositories in 1 Ordner gefunden.")).toBeInTheDocument();
  });

  it("renders singular repo and dative plural paths: '1 Repository in 3 Ordnern gefunden.'", async () => {
    const { findByText } = await renderScanWith({ repoCount: 1, pathCount: 3, lng: "de" });
    expect(await findByText("1 Repository in 3 Ordnern gefunden.")).toBeInTheDocument();
  });
});
