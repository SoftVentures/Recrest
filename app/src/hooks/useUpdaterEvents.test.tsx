import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { Store } from "@reduxjs/toolkit";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdaterEvents } from "@/hooks/useUpdaterEvents";
import { UPDATER_AVAILABLE_EVENT } from "@/lib/constants/events.constants";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

type Handler = (event: { payload: unknown }) => void;

const handlers = new Map<string, Handler>();
const unlisten = vi.fn();
let resolveListen: (() => void) | undefined;

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  listen: (event: string, handler: Handler) =>
    new Promise((resolve) => {
      handlers.set(event, handler);
      // Held open so a test can unmount *before* the subscription resolves —
      // that is the race the `cancelled` flag exists for.
      resolveListen = () => resolve(unlisten);
    }),
}));

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

async function settleListen() {
  await act(async () => {
    resolveListen?.();
    await Promise.resolve();
  });
}

async function mountHook() {
  const store = makeTestStore();
  const rendered = renderHook(() => useUpdaterEvents(), { wrapper: wrapper(store) });
  await settleListen();
  return { store, ...rendered };
}

async function emit(payload: unknown) {
  await act(async () => {
    handlers.get(UPDATER_AVAILABLE_EVENT)?.({ payload });
    await Promise.resolve();
  });
}

describe("useUpdaterEvents", () => {
  beforeEach(() => {
    handlers.clear();
    unlisten.mockClear();
    resolveListen = undefined;
  });

  it("subscribes to the updater-available channel", async () => {
    await mountHook();
    expect(handlers.has(UPDATER_AVAILABLE_EVENT)).toBe(true);
  });

  it("dispatches the banner state from the event payload", async () => {
    const { store } = await mountHook();

    await emit({
      version: "1.4.0",
      currentVersion: "1.3.2",
      body: "notes",
      canAutoInstall: false,
      downloadUrl: "https://example.test/recrest-v1.4.0-mac-arm64.dmg",
    });

    expect(store.getState().ui.updaterBanner).toEqual({
      version: "1.4.0",
      currentVersion: "1.3.2",
      body: "notes",
      canAutoInstall: false,
      downloadUrl: "https://example.test/recrest-v1.4.0-mac-arm64.dmg",
    });
  });

  it("normalises the nullable plugin-path fields", async () => {
    const { store } = await mountHook();

    await emit({
      version: "1.4.0",
      currentVersion: "1.3.2",
      body: null,
      canAutoInstall: true,
      downloadUrl: null,
    });

    expect(store.getState().ui.updaterBanner).toEqual({
      version: "1.4.0",
      currentVersion: "1.3.2",
      body: null,
      canAutoInstall: true,
      downloadUrl: null,
    });
  });

  it("ignores a payload without a version", async () => {
    const { store } = await mountHook();

    await emit({ canAutoInstall: true });

    expect(store.getState().ui.updaterBanner).toBeNull();
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = await mountHook();

    unmount();

    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when the listen promise resolves after unmount", async () => {
    const store = makeTestStore();
    const { unmount } = renderHook(() => useUpdaterEvents(), { wrapper: wrapper(store) });

    unmount();
    await settleListen();

    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
