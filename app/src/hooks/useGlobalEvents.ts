import { useEffect } from "react";

import {
  type CloneProgressEvent,
  EventChannel,
  TauriCommand,
  type UpdaterAvailableEvent,
  type UpdaterProgressEvent,
} from "@recrest/shared";

import { invoke, safeListen } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";
import { setProgress } from "@/store/slices/remoteImportSlice";
import { setUpdaterBanner, setUpdaterProgress } from "@/store/slices/uiSlice";

interface OauthCallbackPayload {
  url: string;
}

/**
 * Subscribes once to the app-wide Tauri events that drive global UI:
 * auto-updater availability, OAuth browser-callback, and bulk-clone progress.
 * Mounting this hook high in the tree (see `AppShell`) gives every feature a
 * single source of truth for these emits.
 */
export function useGlobalEvents(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    void safeListen<UpdaterAvailableEvent>(EventChannel.UPDATER_AVAILABLE, (event) => {
      dispatch(
        setUpdaterBanner({
          version: event.payload.version,
          currentVersion: event.payload.currentVersion,
          body: event.payload.body,
          canAutoInstall: event.payload.canAutoInstall,
          downloadUrl: event.payload.downloadUrl,
        }),
      );
    }).then((fn) => unlisteners.push(fn));

    void safeListen<UpdaterProgressEvent>(EventChannel.UPDATER_PROGRESS, (event) => {
      dispatch(
        setUpdaterProgress({
          chunk: event.payload.chunk,
          total: event.payload.total,
        }),
      );
    }).then((fn) => unlisteners.push(fn));

    void safeListen<CloneProgressEvent>(EventChannel.CLONE_PROGRESS, (event) => {
      dispatch(
        setProgress({
          remoteRepoId: event.payload.remoteRepoId,
          stage: event.payload.stage,
          error: event.payload.error,
        }),
      );
    }).then((fn) => unlisteners.push(fn));

    void safeListen<OauthCallbackPayload>(EventChannel.OAUTH_CALLBACK, async (event) => {
      const raw = event.payload.url;
      try {
        const parsed = new URL(raw);
        const code = parsed.searchParams.get("code");
        const oauthState = parsed.searchParams.get("state");
        const providerId = parsed.searchParams.get("provider") ?? inferProvider(parsed);
        if (!code || !oauthState || !providerId) {
          toast.error("OAuth callback missing code / state");
          return;
        }
        await invoke(TauriCommand.COMPLETE_OAUTH, { providerId, code, oauthState });
        toast.success("Provider connected");
      } catch (err) {
        toast.error(String((err as Error)?.message ?? err));
      }
    }).then((fn) => unlisteners.push(fn));

    return () => {
      for (const fn of unlisteners) fn();
    };
  }, [dispatch]);
}

/** Callback URL layout: `recrest://oauth/callback?provider=github&code=…&state=…`.
 *  Older providers may omit the query param; fall back to the host segment. */
function inferProvider(parsed: URL): string | null {
  const fromQuery = parsed.searchParams.get("provider");
  if (fromQuery) return fromQuery;
  const host = parsed.host || parsed.hostname;
  if (host === "github") return "github";
  if (host === "gitlab") return "gitlab";
  if (host === "bitbucket") return "bitbucket";
  return null;
}
