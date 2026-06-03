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

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const initialOrigins = {
  "alias.co": {
    value: "checkout",
    sourcePath: GLOBAL_PATH,
    sourceCondition: null,
  },
};

function baseInvokeImpl(setResult: Record<string, unknown> = initialOrigins) {
  return async (cmd: unknown) => {
    if (cmd === TauriCommand.LIST_GIT_CONFIG_LAYERS) {
      return [{ path: GLOBAL_PATH, condition: null, active: true, exists: true }];
    }
    if (cmd === TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS) {
      return initialOrigins;
    }
    if (cmd === TauriCommand.SET_GIT_CONFIG_IN_LAYER) {
      return setResult;
    }
    return null;
  };
}

describe("AliasesEditor", () => {
  it("renders a row for each alias.* origin", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl());

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const row = screen.getByTestId(TEST_IDS.gitConfigSettings.aliasesEditor.row("co"));
    expect(row).toBeTruthy();
    expect(row.textContent ?? "").toContain("co");
    const input = row.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("checkout");
  });

  it("submits add form with constructed alias.<name> key", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl());

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const nameInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.aliasesEditor.addNameInput,
    ) as HTMLInputElement;
    const commandInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.aliasesEditor.addCommandInput,
    ) as HTMLInputElement;

    act(() => {
      setInputValue(nameInput, "lol");
      setInputValue(commandInput, "log --oneline");
    });
    await flushPromises();

    const submit = screen.getByTestId(
      TEST_IDS.gitConfigSettings.aliasesEditor.addSubmit,
    ) as HTMLButtonElement;
    await act(async () => {
      submit.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.SET_GIT_CONFIG_IN_LAYER, {
      repoId: null,
      filePath: GLOBAL_PATH,
      key: "alias.lol",
      value: "log --oneline",
    });
  });

  it("dispatches an empty-value SET on remove confirm", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl({}));

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const removeBtn = screen.getByTestId(TEST_IDS.gitConfigSettings.aliasesEditor.remove("co"));
    await act(async () => {
      fireEvent.click(removeBtn);
      await Promise.resolve();
    });
    await flushPromises();

    const confirm = screen.getByTestId(TEST_IDS.confirmDialog.confirm);
    await act(async () => {
      fireEvent.click(confirm);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mocked).toHaveBeenCalledWith(TauriCommand.SET_GIT_CONFIG_IN_LAYER, {
      repoId: null,
      filePath: GLOBAL_PATH,
      key: "alias.co",
      value: "",
    });
  });
});
