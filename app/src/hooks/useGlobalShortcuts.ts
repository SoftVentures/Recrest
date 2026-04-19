import { useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { AppRoute, WindowEvent } from "@recrest/shared";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce, setSearchOpen } from "@/store/slices/uiSlice";

/** Registers the app's keyboard shortcuts on window-level. Uses the standard
 *  `Cmd/Ctrl` bridge (`ev.metaKey || ev.ctrlKey`) so Mac, Windows, and Linux
 *  all get the same bindings without the user configuring anything. Mounted
 *  once from `AppShell`. */
export function useGlobalShortcuts(): void {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);

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
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, navigate, selectedRepoId]);
}
