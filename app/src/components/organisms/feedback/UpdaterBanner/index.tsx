import { useState } from "react";

import { useTranslation } from "react-i18next";

import { TauriCommand, formatBytes } from "@recrest/shared";

import { Button } from "@/components/atoms/Button";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUpdaterBanner, setUpdaterProgress } from "@/store/slices/uiSlice";

const FALLBACK_RELEASES_URL = "https://github.com/SoftVentures/Recrest/releases";

/** Persistent banner anchored to the bottom-right of the shell that appears
 *  when the Rust updater reports a newer version.
 *
 *  Two modes driven by `canAutoInstall`:
 *  - signed release build: "Install & restart" → invokes the Rust
 *    `install_update` command which swaps the binary and relaunches.
 *    While running we display the `updater://progress` stream.
 *  - unsigned/local build: "Download" → opens the platform asset URL
 *    in the system browser so the user can install it themselves.
 */
export function UpdaterBanner() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const banner = useAppSelector((s) => s.ui.updaterBanner);
  const progress = useAppSelector((s) => s.ui.updaterProgress);
  const [installing, setInstalling] = useState(false);
  if (!banner) return null;

  const dismiss = () => {
    dispatch(setUpdaterBanner(null));
    dispatch(setUpdaterProgress(null));
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await invoke(TauriCommand.INSTALL_UPDATE);
      // On success Rust relaunches the app, so no further UI is needed.
    } catch (err) {
      console.warn("[updater] install failed:", err);
      toast.error(t("updater.check_failed", { defaultValue: "Couldn't check for updates" }));
      setInstalling(false);
    }
  };

  const handleDownload = async () => {
    const url = banner.downloadUrl ?? FALLBACK_RELEASES_URL;
    await openExternal(url);
    dismiss();
  };

  return (
    <div
      data-testid="updater-banner"
      className="fixed bottom-4 right-4 z-60 flex max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex-1">
        <div className="text-sm font-medium">
          {t("updater.available_title", {
            version: banner.version,
            defaultValue: "Update available · v{{version}}",
          })}
        </div>
        {banner.body && (
          <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{banner.body}</div>
        )}
        {installing && progress && (
          <div className="mt-2 text-xs text-muted-foreground" data-testid="updater-banner-progress">
            {progress.total !== null
              ? `${formatBytes(progress.chunk)} / ${formatBytes(progress.total)}`
              : formatBytes(progress.chunk)}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          {banner.canAutoInstall ? (
            <Button
              data-testid="updater-banner-install"
              size="sm"
              loading={installing}
              onClick={() => void handleInstall()}
            >
              {installing
                ? t("updater.installing", { defaultValue: "Installing…" })
                : t("updater.install", { defaultValue: "Install & restart" })}
            </Button>
          ) : (
            <Button
              data-testid="updater-banner-download"
              size="sm"
              onClick={() => void handleDownload()}
            >
              {t("updater.download", { defaultValue: "Download" })}
            </Button>
          )}
          <Button
            data-testid="updater-banner-later"
            size="sm"
            variant="outline"
            onClick={dismiss}
            disabled={installing}
          >
            {t("updater.later", { defaultValue: "Later" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
