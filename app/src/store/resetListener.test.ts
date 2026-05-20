import type { EventCallback } from "@tauri-apps/api/event";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { safeListen } from "@/lib/tauri";
import { clearRecrestStorage, registerSettingsResetListener } from "@/store/resetListener";

// `safeListen` is the surface the helper goes through. Mock it so we can
// capture the registered callback and invoke it on demand in the assertion
// step. The real implementation forwards to `@tauri-apps/api/event`'s
// `listen`, which is stubbed in test-setup.ts to a no-op.
vi.mock("@/lib/tauri", () => ({
  safeListen: vi.fn(),
}));

describe("clearRecrestStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("removes only `recrest:` prefixed keys from localStorage and sessionStorage", () => {
    localStorage.setItem("recrest:onboarding-dismissed", "true");
    localStorage.setItem("recrest:logo:abc", "blob");
    localStorage.setItem("unrelated:key", "keep");
    sessionStorage.setItem("recrest:scroll:repos", "120");
    sessionStorage.setItem("unrelated:session", "keep");

    clearRecrestStorage();

    expect(localStorage.getItem("recrest:onboarding-dismissed")).toBeNull();
    expect(localStorage.getItem("recrest:logo:abc")).toBeNull();
    expect(localStorage.getItem("unrelated:key")).toBe("keep");
    expect(sessionStorage.getItem("recrest:scroll:repos")).toBeNull();
    expect(sessionStorage.getItem("unrelated:session")).toBe("keep");
  });
});

describe("registerSettingsResetListener", () => {
  const reloadSpy = vi.fn();
  let originalLocation: Location;

  beforeEach(() => {
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.useRealTimers();
    vi.mocked(safeListen).mockReset();
  });

  it("subscribes to the settings reset channel and runs the wipe-then-reload flow on emit", async () => {
    let captured: EventCallback<unknown> | null = null;
    vi.mocked(safeListen).mockImplementation(async (_evt, handler) => {
      captured = handler as EventCallback<unknown>;
      return () => {};
    });

    localStorage.setItem("recrest:onboarding-dismissed", "true");
    sessionStorage.setItem("recrest:scroll:repos", "42");

    await registerSettingsResetListener();
    // The helper must subscribe to the canonical channel name. We assert
    // on the value rather than re-importing the constant to keep the test
    // tightly coupled to the public contract.
    expect(vi.mocked(safeListen).mock.calls[0]?.[0]).toBe("settings://reset");
    expect(captured).not.toBeNull();

    // Simulate the backend emitting the event.
    captured!({ event: "settings://reset", id: 1, payload: undefined });

    // Storage is wiped synchronously; reload is queued via `setTimeout`.
    expect(localStorage.getItem("recrest:onboarding-dismissed")).toBeNull();
    expect(sessionStorage.getItem("recrest:scroll:repos")).toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
