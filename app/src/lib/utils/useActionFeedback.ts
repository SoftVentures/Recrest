import { useCallback, useEffect, useRef, useState } from "react";

export type ActionFeedbackState = "idle" | "loading" | "success" | "error";

/** Auto-revert delay (ms) from `success`/`error` back to `idle`. */
export const ACTION_FEEDBACK_REVERT_MS = 1500;
/** Minimum visible loading duration — fast resolutions still flash a spinner. */
export const ACTION_FEEDBACK_MIN_LOADING_MS = 400;

export interface UseActionFeedback {
  state: ActionFeedbackState;
  error: Error | null;
  run: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function useActionFeedback(): UseActionFeedback {
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const [error, setError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    // React StrictMode mounts → unmounts → remounts in dev; the previous cleanup
    // would have flipped this to false and leave it false on remount, freezing
    // every post-await setState. Reset on each mount so success/error fire.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Re-throw so callers can still chain `.catch`; hook only owns inline UI affordance.
  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setState("loading");
    setError(null);
    const start = performance.now();
    const ensureMinLoading = async () => {
      const elapsed = performance.now() - start;
      const remaining = ACTION_FEEDBACK_MIN_LOADING_MS - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    };
    try {
      const result = await fn();
      await ensureMinLoading();
      if (!mountedRef.current) return result;
      setState("success");
      timer.current = setTimeout(() => setState("idle"), ACTION_FEEDBACK_REVERT_MS);
      return result;
    } catch (e) {
      await ensureMinLoading();
      if (!mountedRef.current) throw e;
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setState("error");
      timer.current = setTimeout(() => setState("idle"), ACTION_FEEDBACK_REVERT_MS);
      throw e;
    }
  }, []);

  return { state, error, run };
}
