import { type MouseEvent, useCallback, useState } from "react";

export interface ContextMenuPosition {
  left: number;
  top: number;
}

export interface UseContextMenuResult {
  /** Current open position, or null when closed. Pass straight to `<ContextMenu position>`. */
  position: ContextMenuPosition | null;
  /** Convenience boolean — `position !== null`. Use to drive the active-row
   *  outline via a `data-context-menu-open` attribute on the row. */
  open: boolean;
  /** Bind to the row's `onContextMenu`. Calls `preventDefault` so the browser's
   *  native menu doesn't appear. Re-clicking on a different spot moves the menu. */
  onContextMenu: (e: MouseEvent) => void;
  /** Bind to the menu's `onClose`. */
  onClose: () => void;
}

/** Captures right-click coordinates for an anchorPosition-based `<ContextMenu>`.
 *  Use one instance per row; the row's `onContextMenu` calls `onContextMenu`
 *  and the `<ContextMenu>` receives `position` + `onClose`. */
export function useContextMenu(): UseContextMenuResult {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Move (not toggle) when right-clicking again — matches native OS behaviour.
    setPosition({ left: e.clientX, top: e.clientY });
  }, []);

  const onClose = useCallback(() => setPosition(null), []);

  return { position, open: position !== null, onContextMenu, onClose };
}
