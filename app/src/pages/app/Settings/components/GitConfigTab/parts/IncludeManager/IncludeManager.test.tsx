import { act } from "react";

import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { TauriCommand } from "@recrest/shared";

import { fireEvent, screen } from "@testing-library/react";
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
const WORK_CONDITION = "gitdir:/Users/me/work/";

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("IncludeManager", () => {
  it("renders one row per conditional include (skips the unconditional root)", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
        return [
          { path: GLOBAL_PATH, condition: null, active: true, exists: true, entries: {} },
          {
            path: WORK_PATH,
            condition: WORK_CONDITION,
            active: true,
            exists: true,
            entries: {},
          },
        ];
      }
      if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
        return {};
      }
      return null;
    });

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    expect(
      screen.queryByTestId(TEST_IDS.gitConfigSettings.includeManager.row(WORK_CONDITION)),
    ).toBeTruthy();
    expect(screen.queryByTestId(TEST_IDS.gitConfigSettings.includeManager.row(""))).toBeNull();
  });

  it("opens the row menu and invokes REMOVE_GIT_CONFIG_INCLUDE on confirm", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
        return [
          { path: GLOBAL_PATH, condition: null, active: true, exists: true, entries: {} },
          {
            path: WORK_PATH,
            condition: WORK_CONDITION,
            active: true,
            exists: true,
            entries: {},
          },
        ];
      }
      if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
        return {};
      }
      if (cmd === TauriCommand.REMOVE_GIT_CONFIG_INCLUDE) {
        return null;
      }
      return null;
    });

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const menuTrigger = screen.getByTestId(
      TEST_IDS.gitConfigSettings.includeManager.rowMenu(WORK_CONDITION),
    );
    await act(async () => {
      fireEvent.click(menuTrigger);
      await Promise.resolve();
    });
    await flushPromises();

    const removeItem = screen.getByTestId(
      TEST_IDS.gitConfigSettings.includeManager.rowRemove(WORK_CONDITION),
    );
    await act(async () => {
      fireEvent.click(removeItem);
      await Promise.resolve();
    });
    await flushPromises();

    const confirm = screen.getByTestId(TEST_IDS.gitConfigSettings.removeIncludeConfirm.confirm);
    await act(async () => {
      fireEvent.click(confirm);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.REMOVE_GIT_CONFIG_INCLUDE, {
      configFile: GLOBAL_PATH,
      condition: WORK_CONDITION,
      targetPath: WORK_PATH,
      deleteTargetFile: false,
    });
  });

  it("opens the add modal and invokes ADD_GIT_CONFIG_INCLUDE with the constructed gitdir condition", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
        return [{ path: GLOBAL_PATH, condition: null, active: true, exists: true, entries: {} }];
      }
      if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
        return {};
      }
      if (cmd === TauriCommand.ADD_GIT_CONFIG_INCLUDE) {
        return null;
      }
      return null;
    });

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const addButton = screen.getByTestId(TEST_IDS.gitConfigSettings.includeManager.addButton);
    await act(async () => {
      fireEvent.click(addButton);
      await Promise.resolve();
    });
    await flushPromises();

    const setNativeValue = (el: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const dirInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.addIncludeModal.directoryInput,
    ) as HTMLInputElement;
    act(() => {
      setNativeValue(dirInput, "/Users/me/work");
    });
    await flushPromises();

    const submit = screen.getByTestId(
      TEST_IDS.gitConfigSettings.addIncludeModal.submit,
    ) as HTMLButtonElement;
    await act(async () => {
      submit.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.ADD_GIT_CONFIG_INCLUDE, {
      configFile: GLOBAL_PATH,
      condition: "gitdir:/Users/me/work/",
      targetPath: "/home/dev/.gitconfig-work",
      createTargetSkeleton: true,
    });
  });
});
