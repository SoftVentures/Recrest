import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { UPDATER_PROGRESS_EVENT } from "@/lib/constants/events.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, listen, openExternal } from "@/lib/tauri";
import { setUpdaterBanner } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Bar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  backgroundColor: theme.palette.info.light,
  color: theme.palette.info.dark,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Message = styled(Typography)({
  flex: 1,
});

const Progress = styled(Typography)({
  fontVariantNumeric: "tabular-nums",
});

interface UpdaterProgressPayload {
  chunk?: unknown;
  total?: unknown;
}

function UpdaterBanner() {
  const { t } = useTranslation();
  const banner = useAppSelector((s) => s.ui.updaterBanner);
  const dispatch = useAppDispatch();
  const [installing, setInstalling] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  // Progress is subscribed here rather than in `useUpdaterEvents` because it is
  // only meaningful while this banner's own install is running, and there is no
  // slice field to park it in. The listener exists for the duration of the
  // download only.
  useEffect(() => {
    if (!installing) return;

    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let downloaded = 0;

    void (async () => {
      const off = await listen<UpdaterProgressPayload>(UPDATER_PROGRESS_EVENT, (event) => {
        const chunk = event.payload?.chunk;
        const total = event.payload?.total;
        if (typeof chunk !== "number") return;
        downloaded += chunk;
        // `total` is `null` when the server sends no Content-Length; without it
        // a percentage would be a lie, so we keep the plain "Installing…" label.
        if (typeof total !== "number" || total <= 0) return;
        setPercent(Math.min(100, Math.round((downloaded / total) * 100)));
      });
      if (cancelled) off();
      else unlisten = off;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [installing]);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    setPercent(null);
    try {
      // `install_update`, not `check_for_update`: it is the only updater command
      // that reports a failure back to the renderer. A successful call never
      // returns — the backend restarts the app into the new version.
      await invoke(TauriCommand.INSTALL_UPDATE);
    } catch (err) {
      console.warn("[updater] install failed", err);
      toast.error(t("updater.install_failed"));
      setInstalling(false);
      setPercent(null);
    }
  }, [t]);

  const handleDownload = useCallback(
    async (url: string) => {
      try {
        await openExternal(url);
      } catch (err) {
        console.warn("[updater] opening the download URL failed", err);
        toast.error(t("updater.download_failed"));
      }
    },
    [t],
  );

  if (!banner) return null;

  const progressLabel =
    percent === null ? t("updater.installing") : t("updater.installing_percent", { percent });
  // Local const so the string narrowing survives into the click handler.
  // `null` on the plugin path (the backend only fills it on the GitHub
  // fallback), and the fallback itself now degrades to the release page rather
  // than offering a wrong-architecture installer — so a missing URL means there
  // is genuinely nothing to link, and the button is dropped instead of dead.
  const downloadUrl = banner.canAutoInstall ? null : banner.downloadUrl;

  return (
    <Bar data-testid={TEST_IDS.updaterBanner.root}>
      <Message variant="body2">
        {t("updater.available")} <Box component="strong">{banner.version}</Box>
        {banner.currentVersion
          ? ` ${t("updater.current", { version: banner.currentVersion })}`
          : ""}
      </Message>
      {installing ? (
        <Progress variant="body2" data-testid={TEST_IDS.updaterBanner.progress}>
          {progressLabel}
        </Progress>
      ) : null}
      {banner.canAutoInstall ? (
        <GeneralButton
          size="sm"
          variant="default"
          loading={installing}
          onClick={() => void handleInstall()}
          data-testid={TEST_IDS.updaterBanner.install}
        >
          {t("updater.install")}
        </GeneralButton>
      ) : null}
      {downloadUrl ? (
        <GeneralButton
          size="sm"
          variant="outline"
          onClick={() => void handleDownload(downloadUrl)}
          data-testid={TEST_IDS.updaterBanner.download}
        >
          {t("updater.download")}
        </GeneralButton>
      ) : null}
      <GeneralButton
        size="sm"
        variant="ghost"
        onClick={() => dispatch(setUpdaterBanner(null))}
        data-testid={TEST_IDS.updaterBanner.dismiss}
      >
        {t("updater.dismiss")}
      </GeneralButton>
    </Bar>
  );
}

export default UpdaterBanner;
