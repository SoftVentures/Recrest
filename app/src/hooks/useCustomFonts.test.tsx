import { Provider as ReduxProvider } from "react-redux";

import { type Store } from "@reduxjs/toolkit";

import type { CustomFont } from "@recrest/shared";

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCustomFonts } from "@/hooks/useCustomFonts";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

// The boot effect dispatches the real `loadCustomFonts` thunk; stub it to a
// plain identifiable action so we can assert the dispatch without driving a
// live IPC round-trip. The thunk's static `.pending/.fulfilled/.rejected`
// action creators must survive the mock, because `settingsReducer` references
// `loadCustomFonts.fulfilled` at module-load time via `builder.addCase`.
// The reconciliation effect delegates entirely to `syncCustomFontFaces`
// (covered by a dedicated real-implementation suite), so we mock that boundary
// too and verify the hook forwards the current store list to it.
const LOAD_ACTION = { type: "settings/loadCustomFonts/MOCK" } as const;
const loadCustomFontsMock = vi.fn(() => LOAD_ACTION);
const syncCustomFontFacesMock = vi.fn(async (_fonts: CustomFont[]) => {});

vi.mock("@/store/actions/settings.actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/actions/settings.actions")>();
  const stub = (() => loadCustomFontsMock()) as unknown as typeof actual.loadCustomFonts;
  // Preserve the thunk's attached action creators (`.fulfilled` etc.) so the
  // reducer's `addCase(loadCustomFonts.fulfilled, ...)` still resolves.
  Object.assign(stub, actual.loadCustomFonts);
  return { ...actual, loadCustomFonts: stub };
});

vi.mock("@/lib/utils/customFonts.utils", () => ({
  syncCustomFontFaces: (fonts: CustomFont[]) => syncCustomFontFacesMock(fonts),
}));

const TAURI_MARKER = "__TAURI_INTERNALS__";

function setTauri(present: boolean): void {
  if (present) {
    (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
  } else {
    delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
  }
}

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

function makeFont(family: string): CustomFont {
  return {
    id: family.toLowerCase(),
    family,
    fileName: `${family}.ttf`,
    format: "truetype",
    data: "",
  };
}

describe("useCustomFonts", () => {
  beforeEach(() => {
    loadCustomFontsMock.mockClear();
    syncCustomFontFacesMock.mockClear();
  });

  afterEach(() => {
    setTauri(false);
  });

  it("does not dispatch the boot load outside Tauri", () => {
    setTauri(false);
    const store = makeTestStore();
    const dispatch = vi.spyOn(store, "dispatch");

    renderHook(() => useCustomFonts(), { wrapper: wrapper(store) });

    expect(loadCustomFontsMock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(LOAD_ACTION);
  });

  it("dispatches the boot load once inside Tauri", () => {
    setTauri(true);
    const store = makeTestStore();
    const dispatch = vi.spyOn(store, "dispatch");

    renderHook(() => useCustomFonts(), { wrapper: wrapper(store) });

    expect(loadCustomFontsMock).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(LOAD_ACTION);
  });

  it("reconciles font faces with the current store list on mount", () => {
    setTauri(false);
    const fonts = [makeFont("Fira Code"), makeFont("Inter")];
    const store = makeTestStore({ settings: { customFonts: fonts } });

    renderHook(() => useCustomFonts(), { wrapper: wrapper(store) });

    expect(syncCustomFontFacesMock).toHaveBeenCalledTimes(1);
    expect(syncCustomFontFacesMock).toHaveBeenCalledWith(fonts);
  });

  it("runs reconciliation everywhere, including outside Tauri with an empty list", () => {
    setTauri(false);
    const store = makeTestStore();

    renderHook(() => useCustomFonts(), { wrapper: wrapper(store) });

    expect(syncCustomFontFacesMock).toHaveBeenCalledTimes(1);
    expect(syncCustomFontFacesMock).toHaveBeenCalledWith([]);
  });
});
