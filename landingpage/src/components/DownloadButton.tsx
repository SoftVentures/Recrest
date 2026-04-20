import { useTranslation } from "react-i18next";

import { type Os, osLabel, useOsDetect } from "../hooks/useOsDetect";
import { DownloadIcon } from "./icons";

const RELEASES_LATEST = `${__REPO_URL__}/releases/latest`;

// Direct-Download-URL auf das OS-spezifische ZIP aus dem neuesten Release.
// Dateinamens-Schema kommt aus `.github/workflows/release-tauri.yml` (repackage-Job):
// `recrest-v<version>-<os>.zip`. `__APP_VERSION__` stammt aus der root-package.json
// und wird vom release-please-Merge mit jedem Release aktualisiert, d. h. der
// Landingpage-Deploy läuft zeitgleich mit dem Tauri-Release und die URL passt.
function directDownloadUrl(os: Exclude<Os, "unknown">): string {
  const asset = `recrest-v${__APP_VERSION__}-${os}.zip`;
  return `${__REPO_URL__}/releases/latest/download/${asset}`;
}

export function DownloadButton() {
  const { t } = useTranslation();
  const os = useOsDetect();

  const href = os === "unknown" ? RELEASES_LATEST : directDownloadUrl(os);
  const label =
    os === "unknown" ? t("hero.downloadFallback") : t("hero.downloadForOs", { os: osLabel(os) });

  return (
    <a href={href} className="btn btn-primary" target="_blank" rel="noreferrer noopener">
      <DownloadIcon />
      {label}
    </a>
  );
}
