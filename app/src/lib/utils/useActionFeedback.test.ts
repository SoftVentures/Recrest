import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ACTION_FEEDBACK_MIN_LOADING_MS, useActionFeedback } from "@/lib/utils/useActionFeedback";

describe("useActionFeedback", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("sets loading while the async action is in flight, then success", async () => {
    const { result } = renderHook(() => useActionFeedback());
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    act(() => {
      void result.current.run(() => promise);
    });
    expect(result.current.state).toBe("loading");
    await act(async () => {
      resolve();
      await promise;
      // Wait past the min-loading floor so the hook can flip to success.
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("success");
  });

  it("reverts from success back to idle after 1500ms", async () => {
    const { result } = renderHook(() => useActionFeedback());
    await act(async () => {
      await result.current.run(() => Promise.resolve());
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("success");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1600));
    });
    expect(result.current.state).toBe("idle");
  });

  it("sets error when the action rejects and re-throws", async () => {
    const { result } = renderHook(() => useActionFeedback());
    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.run(() => Promise.reject(new Error("fail")));
      } catch (e) {
        caught = e;
      }
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("error");
    expect(result.current.error?.message).toBe("fail");
    expect(caught).toBeInstanceOf(Error);
  });

  it("reverts from error back to idle after 1500ms", async () => {
    const { result } = renderHook(() => useActionFeedback());
    await act(async () => {
      try {
        await result.current.run(() => Promise.reject(new Error("boom")));
      } catch {
        /* expected */
      }
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("error");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1600));
    });
    expect(result.current.state).toBe("idle");
  });

  it("clears the pending revert timer when a new run starts", async () => {
    const { result } = renderHook(() => useActionFeedback());
    await act(async () => {
      await result.current.run(() => Promise.resolve());
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("success");
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    act(() => {
      void result.current.run(() => promise);
    });
    expect(result.current.state).toBe("loading");
    // Past the previous run's 1500ms revert — the second run must hold loading.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1700));
    });
    expect(result.current.state).toBe("loading");
    await act(async () => {
      resolve();
      await promise;
      await new Promise((r) => setTimeout(r, ACTION_FEEDBACK_MIN_LOADING_MS + 50));
    });
    expect(result.current.state).toBe("success");
  });

  it("clears the timer on unmount", async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useActionFeedback());
    await act(async () => {
      const p = result.current.run(() => Promise.resolve());
      // Advance past the min-loading floor so the post-await setState can fire.
      await vi.advanceTimersByTimeAsync(ACTION_FEEDBACK_MIN_LOADING_MS + 10);
      await p;
    });
    expect(result.current.state).toBe("success");
    unmount();
    // No throw / warning: the timer has been cleared.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
  });

  it("does not setState after unmount", async () => {
    const { result, unmount } = renderHook(() => useActionFeedback());
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    const ran = result.current.run(() => promise);
    unmount();
    resolve();
    await expect(ran).resolves.toBeUndefined();
  });
});
