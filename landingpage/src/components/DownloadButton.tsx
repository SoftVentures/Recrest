import { useTranslation } from "react-i18next";

import { DownloadIcon } from "./icons";

export function DownloadButton() {
  const { t } = useTranslation();

  return (
    <a href="#/download" className="btn btn-primary">
      <DownloadIcon />
      {t("hero.downloadFallback")}
    </a>
  );
}
