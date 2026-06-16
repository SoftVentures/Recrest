import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom has no Tauri runtime — stub the IPC surface so slices importing
// `@/lib/tauri` (and transitively `@tauri-apps/api/core`) don't throw at import.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
}));

// jsdom does not implement `matchMedia`; libraries like `sonner` detect
// `prefers-reduced-motion` / `prefers-color-scheme` via this API and crash
// without a shim.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver is used by several Radix primitives — stub it for jsdom.
if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  class ResizeObserverShim {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: typeof ResizeObserverShim }).ResizeObserver =
    ResizeObserverShim;
}

// TipTap's placeholder extension calls ProseMirror's `posAtCoords` on mount,
// which invokes `document.elementFromPoint`. jsdom does not implement that
// CSSOM-View API; without a shim the editor throws synchronously during
// `Editor.createView` and any test mounting a TipTap surface fails.
if (typeof document !== "undefined" && typeof document.elementFromPoint !== "function") {
  (document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => null;
}
