import type { FC, ReactNode } from "react";
import { createElement } from "react";

import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDevFlag } from "@/hooks/useDevFlag";
import { store } from "@/store";
import { setDevFlag } from "@/store/slices/uiDevFlagsSlice";

type StoreType = typeof store;

function wrapper(s: StoreType) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const P = Provider as unknown as FC<{ store: StoreType; children?: ReactNode }>;
    return createElement(P, { store: s }, children);
  };
}

describe("useDevFlag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the flag value from Redux when set (dev branch)", () => {
    store.dispatch(setDevFlag({ name: "x", value: true }));
    const { result } = renderHook(() => useDevFlag("x", false), { wrapper: wrapper(store) });
    expect(result.current).toBe(true);
  });

  it("returns the default when the flag is not set (dev branch)", () => {
    const { result } = renderHook(() => useDevFlag("unknownFlag", "fallback"), {
      wrapper: wrapper(store),
    });
    expect(result.current).toBe("fallback");
  });

  it("returns the default in the production branch without hitting Redux", () => {
    // Vitest exposes `import.meta.env.DEV` as a writable property at test
    // time (unlike a `vite build`, where `vite`'s `define` substitutes it as
    // a compile-time constant). `stubEnv` flips the flag so the prod branch
    // is exercised. Rendering without a Provider proves the hook never
    // reaches `useAppSelector` — an errant selector call would throw.
    // vi.stubEnv's type overload requires string; cast through the broader
    // signature to force the DEV flag to false at runtime.
    (vi.stubEnv as unknown as (name: string, value: unknown) => void)("DEV", false);
    const { result } = renderHook(() => useDevFlag("x", "default"));
    expect(result.current).toBe("default");
  });
});
