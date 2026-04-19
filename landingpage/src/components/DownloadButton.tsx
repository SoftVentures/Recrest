import { useTranslation } from "react-i18next";

import { osLabel, useOsDetect } from "../hooks/useOsDetect";
import { DownloadIcon } from "./icons";

const RELEASES_LATEST = `${__REPO_URL__}/releases/latest`;

export function DownloadButton() {
  const { t } = useTranslation();
  const os = useOsDetect();
  const label =
    os === "unknown" ? t("hero.downloadFallback") : t("hero.downloadForOs", { os: osLabel(os) });

  return (
    <a href={RELEASES_LATEST} className="btn btn-primary" target="_blank" rel="noreferrer noopener">
      <DownloadIcon />
      {label}
    </a>
  );
}
