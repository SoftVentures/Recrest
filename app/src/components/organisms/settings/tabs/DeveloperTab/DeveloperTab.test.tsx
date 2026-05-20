import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DeveloperTab } from "@/components/organisms/settings/tabs/DeveloperTab";

describe("DeveloperTab", () => {
  it("renders every section with the expected data-testids", () => {
    render(
      <SettingsHarness>
        <DeveloperTab />
      </SettingsHarness>,
    );

    expect(screen.getByTestId("developer-tab")).toBeInTheDocument();
    for (const id of [
      "dev-section-build",
      "dev-section-updater",
      "dev-section-storage",
      "dev-section-ipc",
      "dev-section-i18n",
      "dev-section-flags",
      "dev-section-factory-reset",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });
});

describe("FactoryResetSection", () => {
  const reloadSpy = vi.fn();
  let originalLocation: Location;

  beforeEach(() => {
    // jsdom marks `window.location` itself as configurable (whereas `.reload`
    // is locked down). Replace the entire `Location` object with a stand-in
    // whose `.reload` we can assert against; restore in `afterEach`.
    originalLocation = window.location;
    const stub = {
      ...originalLocation,
      reload: reloadSpy,
    } as unknown as Location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: stub,
    });

    reloadSpy.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("opens the confirm dialog when the reset button is clicked", async () => {
    render(
      <SettingsHarness>
        <DeveloperTab />
      </SettingsHarness>,
    );

    // I7: the factory-reset prompt now flows through the shared
    // `useConfirm()` layer — the dialog uses `confirm-dialog-confirm` /
    // `confirm-dialog-cancel` testids instead of bespoke ones.
    expect(screen.queryByTestId("confirm-dialog-confirm")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dev-factory-reset-button"));
    await waitFor(() => expect(screen.getByTestId("confirm-dialog-confirm")).toBeInTheDocument());
  });

  it("clears every recrest:* storage key and reloads when the dialog is confirmed", async () => {
    // Seed both storages: one matching key (must be cleared) and one
    // unrelated key (must survive — the wipe is namespaced).
    localStorage.setItem("recrest:onboarding-dismissed", "true");
    localStorage.setItem("unrelated:key", "keep");
    sessionStorage.setItem("recrest:scroll:repos", "120");
    sessionStorage.setItem("unrelated:session", "keep");

    render(
      <SettingsHarness>
        <DeveloperTab />
      </SettingsHarness>,
    );

    fireEvent.click(screen.getByTestId("dev-factory-reset-button"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");
    fireEvent.click(confirmBtn);

    // Wait for the renderer-side cleanup to finish. The Tauri-side IPC is
    // a no-op in jsdom (safeInvoke short-circuits when `isTauri()` is false),
    // so we observe the cleanup through the keys disappearing instead.
    await waitFor(() => {
      expect(localStorage.getItem("recrest:onboarding-dismissed")).toBeNull();
    });

    // recrest:* keys are gone; unrelated keys survive.
    expect(localStorage.getItem("unrelated:key")).toBe("keep");
    expect(sessionStorage.getItem("recrest:scroll:repos")).toBeNull();
    expect(sessionStorage.getItem("unrelated:session")).toBe("keep");

    // The reload is scheduled behind a 250ms timeout to let the toast paint;
    // wait on real time rather than juggling fake timers (which would clash
    // with Testing Library's `waitFor` polling).
    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1), { timeout: 1500 });
  });
});
