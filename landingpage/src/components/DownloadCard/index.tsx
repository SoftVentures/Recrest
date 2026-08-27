import { useTranslation } from "react-i18next";

import type { Os } from "../../hooks/useOsDetect";
import { buildDownloadUrl, getChannelsForOs } from "../../lib/downloadUrl";
import { InstallInstructions } from "../InstallInstructions";
import { AppleIcon, DownloadIcon, LinuxIcon, WindowsIcon } from "../icons";
import { CommandChannelRow } from "./parts/CommandChannelRow";

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
  const channels = getChannelsForOs(os, __APP_VERSION__);
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
        {channels.map((channel) =>
          channel.kind === "file" ? (
            <li key={channel.filename}>
              <a
                href={buildDownloadUrl(__REPO_URL__, channel.filename)}
                className="btn btn-primary download-card__btn"
                download
              >
                <DownloadIcon />
                {t("download.downloadLabel", { arch: channel.label })}
              </a>
            </li>
          ) : (
            <li key={channel.command}>
              <CommandChannelRow channel={channel} />
            </li>
          ),
        )}
      </ul>

      <InstallInstructions os={os} />
    </div>
  );
}
