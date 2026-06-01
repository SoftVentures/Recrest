import { act } from "react";

import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { TauriCommand } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { GitConfigSection } from "@/pages/app/Settings/components/GitConfigTab";
import { renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";
beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});

const GLOBAL_PATH = "/home/dev/.gitconfig";
const WORK_PATH = "/home/dev/.gitconfig-work";

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("GitConfigSection (layered)", () => {
  it("loads layers + origins, renders a layered field with source badge, and writes to the resolved layer on blur", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();

    const initialOrigins = {
      "user.email": {
        value: "old@example.invalid",
        sourcePath: WORK_PATH,
        sourceCondition: "gitdir:~/work/",
      },
    };
    const updatedOrigins = {
      "user.email": {
        value: "new@example.invalid",
        sourcePath: WORK_PATH,
        sourceCondition: "gitdir:~/work/",
      },
    };

    let currentOrigins: Record<
      string,
      { value: string; sourcePath: string; sourceCondition: string | null }
    > = initialOrigins;

    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
        return [
          {
            path: GLOBAL_PATH,
            condition: null,
            active: true,
            exists: true,
            entries: {},
          },
          {
            path: WORK_PATH,
            condition: "gitdir:~/work/",
            active: true,
            exists: true,
            entries: { "user.email": currentOrigins["user.email"]?.value ?? "" },
          },
        ];
      }
      if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
        return currentOrigins;
      }
      if (cmd === TauriCommand.SET_GIT_CONFIG_IN_LAYER) {
        currentOrigins = updatedOrigins;
        return updatedOrigins;
      }
      return null;
    });

    const { getByTestId } = renderWithProviders(<GitConfigSection />);

    await flushPromises();

    const sourceBadge = getByTestId(
      TEST_IDS.gitConfigSettings.layeredFieldSourceBadge("user.email"),
    );
    expect(sourceBadge.textContent ?? "").toContain(".gitconfig-work");

    const fieldInput = getByTestId(
      TEST_IDS.gitConfigSettings.field("user.email"),
    ) as HTMLInputElement;
    expect(fieldInput).toBeTruthy();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(fieldInput, "new@example.invalid");
      fieldInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      fireEvent.blur(fieldInput);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.SET_GIT_CONFIG_IN_LAYER, {
      repoId: null,
      filePath: WORK_PATH,
      key: "user.email",
      value: "new@example.invalid",
    });
  });
});
