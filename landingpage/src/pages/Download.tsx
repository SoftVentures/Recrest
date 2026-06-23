import { useTranslation } from "react-i18next";

import { DownloadCard } from "../components/DownloadCard";
import { ShieldOffIcon } from "../components/icons";
import { useOsDetect } from "../hooks/useOsDetect";

const ALL_OS = ["macos", "windows", "linux"] as const;

export function DownloadPage() {
  const { t } = useTranslation();
  const detectedOs = useOsDetect();

  return (
    <main id="main" className="download-main">
      <div className="wrap download-wrap">
        <a href="#" className="legal-back">
          ← {t("legal.backToHome")}
        </a>

        <header className="download-header">
          <h1>{t("download.title")}</h1>
          <p className="download-subtitle">{t("download.subtitle")}</p>
        </header>

        <div className="download-disclaimer" role="note">
          <span className="download-disclaimer__icon" aria-hidden="true">
            <ShieldOffIcon width={22} height={22} />
          </span>
          <div className="download-disclaimer__text">
            <p className="download-disclaimer__title">{t("download.disclaimer.title")}</p>
            <p className="download-disclaimer__body">{t("download.disclaimer.body")}</p>
          </div>
        </div>

        <div className="download-grid">
          {ALL_OS.map((os) => (
            <DownloadCard key={os} os={os} highlighted={detectedOs === os} />
          ))}
        </div>
      </div>
    </main>
  );
}
