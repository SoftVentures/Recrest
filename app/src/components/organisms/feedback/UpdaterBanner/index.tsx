import { useTranslation } from "react-i18next";

import { Button } from "@/components/atoms/Button";
import { openExternal } from "@/lib/tauri";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUpdaterBanner } from "@/store/slices/uiSlice";

/** Persistent banner anchored to the top of the shell that appears when the
 *  Tauri updater reports a newer version. Clicking "Download" opens the
 *  release page in the user's browser; the actual binary swap still happens
 *  via the OS installer so the user never loses an un-saved state. */
export function UpdaterBanner() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const banner = useAppSelector((s) => s.ui.updaterBanner);
  if (!banner) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
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
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              void openExternal("https://github.com/softventures/recrest/releases");
              dispatch(setUpdaterBanner(null));
            }}
          >
            {t("updater.download", { defaultValue: "Download" })}
          </Button>
          <Button size="sm" variant="outline" onClick={() => dispatch(setUpdaterBanner(null))}>
            {t("updater.later", { defaultValue: "Later" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
