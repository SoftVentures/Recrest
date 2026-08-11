import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import { I18nextProvider } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import i18n from "@/locales";
import { makeAppSettings } from "@/test/fixtures/appSettings";
import { makeTestStore } from "@/test/utils";

const invoke = vi.fn();
/** Resolvers for `get_settings_corruption`, so a test can leave it in flight. */
const corruptionDeferrals: Array<(value: unknown) => void> = [];

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: (command: string, args?: Record<string, unknown>) => invoke(command, args),
  listen: () => Promise.resolve(() => {}),
}));

function renderBootstrap() {
  const store = makeTestStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <ReduxProvider store={store}>{children}</ReduxProvider>
    </I18nextProvider>
  );
  renderHook(() => useAppBootstrap(), { wrapper });
  return store;
}

const commandsCalled = () => invoke.mock.calls.map(([command]) => command as string);

describe("useAppBootstrap", () => {
  beforeEach(() => {
    invoke.mockReset();
    corruptionDeferrals.length = 0;
    invoke.mockImplementation((command: string) => {
      if (command === TauriCommand.GET_SETTINGS_CORRUPTION) {
        return new Promise((resolve) => corruptionDeferrals.push(resolve));
      }
      if (command === TauriCommand.GET_SETTINGS) return Promise.resolve(makeAppSettings());
      // `list_providers` and every other boot command answer with an empty list.
      return Promise.resolve([]);
    });
  });

  it("does not block the settings and repo load on the corruption probe", async () => {
    // The probe used to be awaited first, putting a serial IPC round-trip in
    // front of every cold start for a condition that is almost never true.
    renderBootstrap();

    await waitFor(() => {
      expect(commandsCalled()).toContain(TauriCommand.GET_SETTINGS);
    });
    expect(commandsCalled()).toContain(TauriCommand.LIST_REPOS);
    // Still in flight — the bootstrap never waited for it.
    expect(corruptionDeferrals).toHaveLength(1);
  });

  it("kicks off a discovery scan when scan paths exist but no repos do", async () => {
    invoke.mockImplementation((command: string) => {
      if (command === TauriCommand.GET_SETTINGS_CORRUPTION) return Promise.resolve(null);
      if (command === TauriCommand.GET_SETTINGS) {
        return Promise.resolve(makeAppSettings({ scanPaths: ["/dev"] }));
      }
      if (command === TauriCommand.LIST_REPOS) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderBootstrap();

    await waitFor(() => {
      expect(commandsCalled()).toContain(TauriCommand.SCAN_REPOS);
    });
  });
});
