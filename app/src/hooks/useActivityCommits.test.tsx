import { Provider as ReduxProvider } from "react-redux";

import { type Store } from "@reduxjs/toolkit";

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useActivityCommits } from "@/hooks/useActivityCommits";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

describe("useActivityCommits", () => {
  it("returns empty defaults outside Tauri without crashing", () => {
    const store = makeTestStore();
    const { result } = renderHook(() => useActivityCommits(), {
      wrapper: wrapper(store),
    });

    expect(result.current.commits).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.truncated).toBe(false);
  });
});
