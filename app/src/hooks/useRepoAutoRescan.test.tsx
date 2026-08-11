import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { Store } from "@reduxjs/toolkit";

import {
  REPO_RESCAN_INTERVAL_MS,
  REPO_RESCAN_MIN_INTERVAL_MS,
  TauriCommand,
  WINDOW_FOCUSED_EVENT,
} from "@recrest/shared";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRepoAutoRescan } from "@/hooks/useRepoAutoRescan";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

const listeners = new Map<string, () => void>();
const unlisten = vi.fn();
const invoke = vi.fn();

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: (command: string, args?: Record<string, unknown>) => invoke(command, args),
  listen: (event: string, handler: () => void) => {
    listeners.set(event, handler);
    return Promise.resolve(unlisten);
  },
}));

const SCAN_PATHS = ["/dev"];

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

/** Mount and let the `await listen(...)` inside the effect settle. */
async function mountRescan(scanPaths: string[] = SCAN_PATHS) {
  const store = makeTestStore({ repos: { scanPaths } });
  const rendered = renderHook(() => useRepoAutoRescan(), { wrapper: wrapper(store) });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return { store, ...rendered };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function fireWindowFocus() {
  await act(async () => {
    listeners.get(WINDOW_FOCUSED_EVENT)?.();
    await Promise.resolve();
  });
}

function countScans() {
  return invoke.mock.calls.filter(([command]) => command === TauriCommand.SCAN_REPOS).length;
}

describe("useRepoAutoRescan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listeners.clear();
    unlisten.mockClear();
    invoke.mockReset();
    invoke.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes to the window-focus event", async () => {
    await mountRescan();
    expect(listeners.has(WINDOW_FOCUSED_EVENT)).toBe(true);
  });

  it("rescans on the interval", async () => {
    await mountRescan();
    expect(countScans()).toBe(0);

    await advance(REPO_RESCAN_INTERVAL_MS);

    expect(countScans()).toBe(1);
    expect(invoke).toHaveBeenCalledWith(TauriCommand.SCAN_REPOS, { paths: SCAN_PATHS });
  });

  it("does not scan while no scan root is configured", async () => {
    await mountRescan([]);

    await advance(REPO_RESCAN_INTERVAL_MS * 2);

    expect(countScans()).toBe(0);
  });

  it("ignores a focus event inside the throttle window", async () => {
    await mountRescan();

    // Mount seeds the throttle, so an immediate alt-tab must not walk the tree
    // the bootstrap scan just walked.
    await fireWindowFocus();
    expect(countScans()).toBe(0);

    await advance(REPO_RESCAN_MIN_INTERVAL_MS);
    await fireWindowFocus();
    expect(countScans()).toBe(1);
  });

  it("does not start a second scan while one is still running", async () => {
    // A walk that outlives the throttle window: the time guard alone would let
    // the next trigger through and duplicate the disk pass.
    invoke.mockReturnValue(new Promise(() => {}));
    await mountRescan();

    await advance(REPO_RESCAN_INTERVAL_MS);
    expect(countScans()).toBe(1);

    await advance(REPO_RESCAN_INTERVAL_MS);
    await fireWindowFocus();

    expect(countScans()).toBe(1);
  });

  it("accepts a new trigger once the running scan settled", async () => {
    let resolveScan: ((value: unknown[]) => void) | undefined;
    invoke.mockReturnValueOnce(
      new Promise<unknown[]>((resolve) => {
        resolveScan = resolve;
      }),
    );
    invoke.mockResolvedValue([]);
    await mountRescan();

    await advance(REPO_RESCAN_INTERVAL_MS);
    expect(countScans()).toBe(1);

    await act(async () => {
      resolveScan?.([]);
      await Promise.resolve();
    });

    await advance(REPO_RESCAN_INTERVAL_MS);
    expect(countScans()).toBe(2);
  });

  it("stops the interval and unsubscribes on unmount", async () => {
    const { unmount } = await mountRescan();

    unmount();
    await advance(REPO_RESCAN_INTERVAL_MS * 2);

    expect(unlisten).toHaveBeenCalledTimes(1);
    expect(countScans()).toBe(0);
  });

  it("keeps repos.loading untouched so the header refresh indicator stays idle", async () => {
    const { store } = await mountRescan();

    await advance(REPO_RESCAN_INTERVAL_MS);

    expect(store.getState().repos.loading).toBe(false);
  });
});
