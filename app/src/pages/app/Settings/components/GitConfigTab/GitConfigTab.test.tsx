import { act } from "react";

import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { TauriCommand } from "@recrest/shared";

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

describe("GitConfigSection", () => {
  it("dispatches SET_GIT_CONFIG when the user edits a field and clicks Save", async () => {
    const mocked = vi.mocked(mockedInvoke);
    mocked.mockReset();
    mocked.mockImplementation(async (cmd: unknown) => {
      if (cmd === TauriCommand.GET_GIT_CONFIG) {
        return { scope: "global", entries: { "user.name": "old" } };
      }
      return { scope: "global", entries: { "user.name": "new" } };
    });

    const { getByTestId } = renderWithProviders(<GitConfigSection />);

    // Wait for the initial GET to settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = getByTestId(TEST_IDS.gitConfigSettings.field("user.name")) as HTMLInputElement;
    expect(input.value).toBe("old");

    // The TextField forwards onChange via the native input — fire it manually.
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "new");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const save = getByTestId(TEST_IDS.gitConfigSettings.save) as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    await act(async () => {
      save.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocked).toHaveBeenCalledWith(TauriCommand.SET_GIT_CONFIG, {
      repoId: null,
      key: "user.name",
      value: "new",
    });
  });
});
