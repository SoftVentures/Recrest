import { act } from "react";

import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { TauriCommand } from "@recrest/shared";

import { fireEvent, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import RepoGitConfigCard from "@/components/organisms/repos/RepoGitConfigCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";
beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});

const GLOBAL_PATH = "/home/me/.gitconfig";
const WORK_PATH = "/home/me/.gitconfig-work";
const LOCAL_PATH = "/Users/me/work/myrepo/.git/config";
const REPO_ID = "repo-abc";

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("RepoGitConfigCard", () => {
  it("loads layers + origins for the repo, shows the resolved layer in the source badge, lists the chain, and links to settings", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();

    const origins = {
      "user.name": {
        value: "Repo User",
        sourcePath: GLOBAL_PATH,
        sourceCondition: null,
      },
      "user.email": {
        value: "work@example.invalid",
        sourcePath: WORK_PATH,
        sourceCondition: "gitdir:/Users/me/work/",
      },
    };

    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
        return [
          { path: GLOBAL_PATH, condition: null, active: true, exists: true, entries: {} },
          {
            path: WORK_PATH,
            condition: "gitdir:/Users/me/work/",
            active: true,
            exists: true,
            entries: {},
          },
          { path: LOCAL_PATH, condition: null, active: true, exists: true, entries: {} },
        ];
      }
      if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
        return origins;
      }
      return null;
    });

    const { getByTestId } = renderWithProviders(<RepoGitConfigCard repoId={REPO_ID} />);

    await flushPromises();

    expect(getByTestId(TEST_IDS.repoDetail.gitConfig.root)).toBeTruthy();

    const emailBadge = getByTestId(
      TEST_IDS.gitConfigSettings.layeredFieldSourceBadge("user.email"),
    );
    expect(emailBadge.textContent ?? "").toContain(".gitconfig-work");

    const nameBadge = getByTestId(TEST_IDS.gitConfigSettings.layeredFieldSourceBadge("user.name"));
    expect(nameBadge.textContent ?? "").toContain(".gitconfig");

    const chainList = getByTestId(TEST_IDS.repoDetail.gitConfig.chainList);
    expect(chainList.textContent ?? "").toContain(".gitconfig");
    expect(chainList.textContent ?? "").toContain(".gitconfig-work");
    expect(chainList.textContent ?? "").toContain("config");

    expect(getByTestId(TEST_IDS.repoDetail.gitConfig.chainRow(".gitconfig"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoDetail.gitConfig.chainRow(".gitconfig-work"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.repoDetail.gitConfig.chainRow("config"))).toBeTruthy();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.LIST_GIT_CONFIG_LAYERS, {
      repoId: REPO_ID,
    });
    expect(mocked).toHaveBeenCalledWith(TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS, {
      repoId: REPO_ID,
    });

    const link = getByTestId(TEST_IDS.repoDetail.gitConfig.fullSettingsLink) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(link);
      await Promise.resolve();
    });
    await flushPromises();

    expect(screen.queryByTestId(TEST_IDS.repoDetail.gitConfig.error)).toBeNull();
  });
});
