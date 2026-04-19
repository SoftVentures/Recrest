import { useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { DEEP_LINK_ACTIONS, DEEP_LINK_SCHEME } from "@recrest/shared";

import { useAppDispatch } from "@/store/hooks";
import { addRepo } from "@/store/slices/reposSlice";
import { setActiveView, setSelectedRepo } from "@/store/slices/uiSlice";

/**
 * Handles `recrest://` deep-links arriving from the OS. Supports:
 *   recrest://open-repo/<repoId>
 *   recrest://open-pr/<repoId>/<prNumber>
 *   recrest://add-repo?path=<absolutePath>
 */
export function useDeepLinks(enabled: boolean): void {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    let unlisten: (() => void) | null = null;

    void (async () => {
      try {
        const { onOpenUrl, getCurrent } = await import("@tauri-apps/plugin-deep-link");

        const handle = (urls: string[] | null) => {
          if (!urls) return;
          for (const raw of urls) handleUrl(raw);
        };

        const handleUrl = (raw: string) => {
          try {
            const url = new URL(raw);
            if (url.protocol.replace(":", "") !== DEEP_LINK_SCHEME) return;
            // URL parses `recrest://open-repo/abc` so that host=open-repo,
            // pathname=/abc. We use hostname as the action slug.
            const action = url.hostname;
            const parts = url.pathname.split("/").filter(Boolean);

            if (action === DEEP_LINK_ACTIONS.openRepo && parts[0]) {
              dispatch(setSelectedRepo(parts[0]));
              dispatch(setActiveView("repos"));
              navigate(`/repos/${encodeURIComponent(parts[0])}`);
              return;
            }

            if (action === DEEP_LINK_ACTIONS.openPr && parts[0]) {
              dispatch(setSelectedRepo(parts[0]));
              dispatch(setActiveView("merge-requests"));
              navigate("/merge-requests");
              return;
            }

            if (action === DEEP_LINK_ACTIONS.addRepo) {
              const path = url.searchParams.get("path");
              if (path) {
                void dispatch(addRepo({ path }));
              }
              return;
            }
          } catch (err) {
            console.warn("[deep-link] parse failed:", raw, err);
          }
        };

        // Replay any URL the OS already queued before we subscribed.
        const initial = await getCurrent();
        handle(initial);

        unlisten = await onOpenUrl(handle);
      } catch (err) {
        console.warn("[deep-link] setup failed:", err);
      }
    })();

    return () => {
      unlisten?.();
    };
  }, [dispatch, enabled, navigate]);
}
