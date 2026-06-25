import { useCallback, useEffect, useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { AppRoute } from "@recrest/shared";

import { SHORTCUT_ID, type ShortcutId } from "@/lib/constants/shortcuts.constants";
import { resolveShortcuts } from "@/lib/utils/shortcuts.utils";
import { setSearchOpen, toggleSidebar } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Binds the global keyboard shortcuts declared in `SHORTCUTS`, with any
 * user overrides from `settings → shortcuts` merged on top. Mounted once in
 * `AppLayout`. All combos are modifier-based (⌘/Ctrl), so they coexist with
 * plain text entry without an input-focus guard.
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const overrides = useAppSelector((s) => s.shortcuts.overrides);
  const resolved = useMemo(() => resolveShortcuts(overrides), [overrides]);

  const run = useCallback(
    (id: ShortcutId) => {
      switch (id) {
        case SHORTCUT_ID.NAV_DASHBOARD:
          navigate(AppRoute.DASHBOARD);
          break;
        case SHORTCUT_ID.NAV_REPOS:
          navigate(AppRoute.REPOS);
          break;
        case SHORTCUT_ID.NAV_MERGE_REQUESTS:
          navigate(AppRoute.MERGE_REQUESTS);
          break;
        case SHORTCUT_ID.NAV_CHANGES:
          navigate(AppRoute.CHANGES);
          break;
        case SHORTCUT_ID.NAV_BRANCHES:
          navigate(AppRoute.BRANCHES);
          break;
        case SHORTCUT_ID.NAV_ACTIVITY:
          navigate(AppRoute.ACTIVITY);
          break;
        case SHORTCUT_ID.NAV_SETTINGS:
          navigate(AppRoute.SETTINGS);
          break;
        case SHORTCUT_ID.SEARCH:
          dispatch(setSearchOpen(true));
          break;
        case SHORTCUT_ID.TOGGLE_SIDEBAR:
          dispatch(toggleSidebar());
          break;
      }
    },
    [navigate, dispatch],
  );

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.repeat) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      for (const def of resolved) {
        const c = def.combo;
        if (!!c.mod !== mod) continue;
        if (!!c.shift !== e.shiftKey) continue;
        if (!!c.alt !== e.altKey) continue;
        if (key !== c.key) continue;
        e.preventDefault();
        run(def.id);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, resolved]);
}
