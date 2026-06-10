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
const GH_KEY = "url.https://github.com/.insteadOf";

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
  [GH_KEY]: {
    value: "git@github.com:",
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

describe("UrlRewritesEditor", () => {
  it("renders a row for each url.*.insteadOf / pushInsteadOf origin", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl());

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const row = screen.getByTestId(TEST_IDS.gitConfigSettings.urlRewritesEditor.row(GH_KEY));
    expect(row).toBeTruthy();
    const text = row.textContent ?? "";
    expect(text).toContain("https://github.com/");
    expect(text).toContain("insteadOf");
    const input = row.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("git@github.com:");
  });

  it("submits add form with constructed url.<to>.<direction> key", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl());

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const fromInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.urlRewritesEditor.addFromInput,
    ) as HTMLInputElement;
    const toInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.urlRewritesEditor.addToInput,
    ) as HTMLInputElement;
    const directionInput = screen.getByTestId(
      TEST_IDS.gitConfigSettings.urlRewritesEditor.addDirectionSelect,
    ) as HTMLInputElement;

    act(() => {
      setInputValue(fromInput, "ssh://git@gitlab.com/");
      setInputValue(toInput, "https://gitlab.com/");
      setInputValue(directionInput, "pushInsteadOf");
    });
    await flushPromises();

    const submit = screen.getByTestId(
      TEST_IDS.gitConfigSettings.urlRewritesEditor.addSubmit,
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
      key: "url.https://gitlab.com/.pushInsteadOf",
      value: "ssh://git@gitlab.com/",
    });
  });

  it("dispatches an empty-value SET on remove confirm", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(baseInvokeImpl({}));

    renderWithProviders(<GitConfigSection />);
    await flushPromises();

    const removeBtn = screen.getByTestId(
      TEST_IDS.gitConfigSettings.urlRewritesEditor.remove(GH_KEY),
    );
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
      key: GH_KEY,
      value: "",
    });
  });
});
