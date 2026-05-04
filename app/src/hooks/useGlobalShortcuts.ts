import { useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { AppRoute, WindowEvent } from "@recrest/shared";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";
import { bumpRefreshNonce, setSearchOpen } from "@/store/slices/uiSlice";

/** Plan 1 §D.6: bounds for the user-facing UI scale. Chosen so 100%
 *  remains the default "perfect" scale and the slider Settings UI can
 *  reuse the same constants. Step is 10pp per hotkey press. */
export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.5;
export const UI_SCALE_STEP = 0.1;
const UI_SCALE_DEFAULT = 1.0;

function clampUiScale(n: number): number {
  if (Number.isNaN(n)) return UI_SCALE_DEFAULT;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(n * 100) / 100));
}

/** Registers the app's keyboard shortcuts on window-level. Uses the standard
 *  `Cmd/Ctrl` bridge (`ev.metaKey || ev.ctrlKey`) so Mac, Windows, and Linux
 *  all get the same bindings without the user configuring anything. Mounted
 *  once from `AppShell`. */
export function useGlobalShortcuts(): void {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const uiScale = useAppSelector((s) => s.settings.uiScale ?? UI_SCALE_DEFAULT);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      // Ignore when the focus is in a real text field so people can still type.
      const t = ev.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA" || (t?.isContentEditable ?? false);

      const mod = ev.metaKey || ev.ctrlKey;
      if (!mod) return;

      const key = ev.key.toLowerCase();

      // ⌘K — open search. Allowed inside inputs too.
      if (key === "k" && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        dispatch(setSearchOpen(true));
        return;
      }

      if (editable) return;

      // ⌘⇧P — pull current branch (no-op placeholder for now; toasts so the
      // user can tell the shortcut is wired). Once there's a real "pull"
      // thunk this fires it instead.
      if (key === "p" && ev.shiftKey) {
        ev.preventDefault();
        window.dispatchEvent(new CustomEvent(WindowEvent.PULL_CURRENT, { detail: selectedRepoId }));
        return;
      }

      // ⌘F — fetch all (triggers the same flow as header refresh).
      if (key === "f" && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        void dispatch(loadRepos());
        dispatch(bumpRefreshNonce());
        return;
      }

      // ⌘↵ — open selected repo in configured IDE (handler lives in the
      // detail pane; emit a CustomEvent so we don't have to wire IPC here).
      if ((key === "enter" || ev.key === "Enter") && !ev.shiftKey && !ev.altKey) {
        if (selectedRepoId) {
          ev.preventDefault();
          window.dispatchEvent(
            new CustomEvent(WindowEvent.OPEN_EDITOR, { detail: selectedRepoId }),
          );
        }
        return;
      }

      // ⌘T — open terminal at selected repo path.
      if (key === "t" && !ev.shiftKey && !ev.altKey) {
        if (selectedRepoId) {
          ev.preventDefault();
          window.dispatchEvent(
            new CustomEvent(WindowEvent.OPEN_TERMINAL, { detail: selectedRepoId }),
          );
        }
        return;
      }

      // ⌘] — toggle detail pane.
      if (key === "]" && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        window.dispatchEvent(new CustomEvent(WindowEvent.TOGGLE_DETAIL));
        return;
      }

      // ⌘, — open settings.
      if (ev.key === "," && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        navigate(AppRoute.SETTINGS);
        return;
      }

      // ⌘+ / ⌘− / ⌘0 — UI scale (Plan 1 §D.6). `=` is the unshifted form of
      // `+` on most keyboards; we accept both so users on layouts that
      // require Shift for `+` still hit the bind. Persisted via Redux so
      // the Settings slider and the hotkey share state.
      if (ev.key === "=" || ev.key === "+") {
        ev.preventDefault();
        const next = clampUiScale(uiScale + UI_SCALE_STEP);
        if (next !== uiScale) void dispatch(saveSettings({ uiScale: next }));
        return;
      }
      if (ev.key === "-" || ev.key === "_") {
        ev.preventDefault();
        const next = clampUiScale(uiScale - UI_SCALE_STEP);
        if (next !== uiScale) void dispatch(saveSettings({ uiScale: next }));
        return;
      }
      if (ev.key === "0") {
        ev.preventDefault();
        if (uiScale !== UI_SCALE_DEFAULT) {
          void dispatch(saveSettings({ uiScale: UI_SCALE_DEFAULT }));
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, navigate, selectedRepoId, uiScale]);
}
