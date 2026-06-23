import { useTranslation } from "react-i18next";

import type { Os } from "../../hooks/useOsDetect";
import { buildDownloadUrl, getAssetsForOs } from "../../lib/downloadUrl";
import { InstallInstructions } from "../InstallInstructions";
import { AppleIcon, DownloadIcon, LinuxIcon, WindowsIcon } from "../icons";

type Props = {
  os: Exclude<Os, "unknown">;
  highlighted?: boolean;
};

const OS_LABEL: Record<Exclude<Os, "unknown">, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const OS_ICON = {
  macos: AppleIcon,
  windows: WindowsIcon,
  linux: LinuxIcon,
} as const;

export function DownloadCard({ os, highlighted = false }: Props) {
  const { t } = useTranslation();
  const assets = getAssetsForOs(os, __APP_VERSION__);
  const OsIcon = OS_ICON[os];

  return (
    <div className={`download-card${highlighted ? " download-card--highlighted" : ""}`}>
      {highlighted && <span className="download-card__detected">{t("download.detectedOs")}</span>}
      <h2 className="download-card__title">
        <span className="download-card__icon" aria-hidden="true">
          <OsIcon width={22} height={22} />
        </span>
        {OS_LABEL[os]}
      </h2>
      <p className="download-card__sub">{t(`download.osSub.${os}`)}</p>

      <ul className="download-card__links">
        {assets.map((asset) => (
          <li key={asset.filename}>
            <a
              href={buildDownloadUrl(__REPO_URL__, asset.filename)}
              className="btn btn-primary download-card__btn"
              download
            >
              <DownloadIcon />
              {t("download.downloadLabel", { arch: asset.label })}
            </a>
          </li>
        ))}
      </ul>

      <InstallInstructions os={os} />
    </div>
  );
}
