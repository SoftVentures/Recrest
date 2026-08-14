import { useEffect } from "react";

import { UPDATER_AVAILABLE_EVENT } from "@/lib/constants/events.constants";
import { isTauri, listen } from "@/lib/tauri";
import { setUpdaterBanner } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

/** Payload of `updater://available`, emitted by `src-tauri/src/update/`.
 *  Both the plugin path (`mod.rs`) and the GitHub fallback (`github.rs`) send
 *  the same shape; `downloadUrl` is only populated on the fallback path. */
interface UpdaterAvailablePayload {
  version?: unknown;
  currentVersion?: unknown;
  body?: unknown;
  canAutoInstall?: unknown;
  downloadUrl?: unknown;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Bridges the backend's `updater://available` event into the Redux banner state.
 *
 * Without this the banner was unreachable outside the Developer tab's updater
 * playground: the backend emitted on every startup check, but nothing in the
 * renderer ever subscribed, so a real update never surfaced.
 *
 * Mount exactly once (AppLayout). A second mount would re-dispatch the same
 * banner and undo a dismissal the moment another check fires.
 */
export function useUpdaterEvents(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const off = await listen<UpdaterAvailablePayload>(UPDATER_AVAILABLE_EVENT, (event) => {
        const payload = event.payload;
        const version = asStringOrNull(payload?.version);
        // A payload without a version has nothing to show — the banner headline
        // is built around it, so rendering "A new version is available:" alone
        // would be worse than staying silent.
        if (!version) return;

        dispatch(
          setUpdaterBanner({
            version,
            currentVersion: asStringOrNull(payload.currentVersion) ?? undefined,
            body: asStringOrNull(payload.body),
            canAutoInstall: payload.canAutoInstall === true,
            downloadUrl: asStringOrNull(payload.downloadUrl),
          }),
        );
      });

      // `listen` resolves asynchronously, so the effect can already have been
      // torn down by the time we get the unsubscribe handle.
      if (cancelled) off();
      else unlisten = off;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [dispatch]);
}
