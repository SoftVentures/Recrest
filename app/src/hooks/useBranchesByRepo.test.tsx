import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { Store } from "@reduxjs/toolkit";

import { EventChannel } from "@recrest/shared";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBranchesByRepo } from "@/hooks/useBranchesByRepo";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

const listenCalls: string[] = [];
const unlisten = vi.fn();
const invoke = vi.fn();

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: (command: string, args?: Record<string, unknown>) => invoke(command, args),
  // Resolves on a microtask, exactly like the real Tauri `listen` — the effect
  // cleanup can therefore run before the subscription handle exists.
  listen: (event: string) => {
    listenCalls.push(event);
    return Promise.resolve(unlisten);
  },
}));

// The hook only ever reads `id` off each repo; the rest of `EnrichedRepo` is
// irrelevant to subscription lifecycle.
const repo = (id: string) => ({ id }) as EnrichedRepo;

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

function mountHook(initialRepos: EnrichedRepo[]) {
  const store = makeTestStore();
  return renderHook(({ repos }: { repos: EnrichedRepo[] }) => useBranchesByRepo(repos), {
    wrapper: wrapper(store),
    initialProps: { repos: initialRepos },
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useBranchesByRepo", () => {
  beforeEach(() => {
    listenCalls.length = 0;
    unlisten.mockClear();
    invoke.mockReset();
    invoke.mockResolvedValue([]);
  });

  it("subscribes to the repo-status channel", async () => {
    mountHook([repo("r1")]);
    await flush();

    expect(listenCalls).toEqual([EventChannel.REPO_STATUS]);
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = mountHook([repo("r1")]);
    await flush();

    unmount();
    await flush();

    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes the pending listener when the repo set changes before it resolved", async () => {
    const { rerender, unmount } = mountHook([repo("r1")]);
    // The Branches page settles its repo set one render after mount, so the
    // first effect's cleanup fires while `listen` is still pending. Without the
    // cancelled-flag guard that first subscription leaks forever.
    rerender({ repos: [repo("r1"), repo("r2")] });
    await flush();

    expect(listenCalls).toHaveLength(2);
    expect(unlisten).toHaveBeenCalledTimes(1);

    unmount();
    await flush();

    expect(unlisten).toHaveBeenCalledTimes(2);
  });

  it("keeps a single subscription when the repo set is value-equal", async () => {
    const { rerender } = mountHook([repo("r1")]);
    await flush();
    rerender({ repos: [repo("r1")] });
    await flush();

    expect(listenCalls).toHaveLength(1);
    expect(unlisten).not.toHaveBeenCalled();
  });
});
