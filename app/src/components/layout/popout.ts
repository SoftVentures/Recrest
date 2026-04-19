/** Opens a stand-alone window that re-renders the detail pane for one repo.
 *
 * Strategy: copy the current page's stylesheets into the new document so
 * design tokens + layout CSS match, and add a hash (`#repo=<id>`) that the
 * app picks up on mount to render only the detail pane. */
export function popOutDetailWindow(repoId: string): void {
  const w = window.open(
    `${window.location.pathname}#detail=${encodeURIComponent(repoId)}`,
    `recrest-detail-${repoId}`,
    "width=480,height=820,menubar=no,toolbar=no,location=no,status=no",
  );
  if (!w) return;
  try {
    w.focus();
  } catch {
    // noop
  }
}

/** Parses `#detail=<id>` on the current location and returns the id if set. */
export function detailHashId(): string | null {
  const h = window.location.hash;
  const m = h.match(/detail=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return null;
  }
}
