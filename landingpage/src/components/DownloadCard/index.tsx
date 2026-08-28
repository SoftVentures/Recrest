import { useTranslation } from "react-i18next";

import type { Os } from "../../hooks/useOsDetect";
import { buildDownloadUrl, getChannelsForOs } from "../../lib/downloadUrl";
import { InstallInstructions } from "../InstallInstructions";
import { AppleIcon, DownloadIcon, ExternalLinkIcon, LinuxIcon, WindowsIcon } from "../icons";
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
        {channels.map((channel) => {
          switch (channel.kind) {
            case "file":
              return (
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
              );
            // Ghost rather than primary, and no `download` attribute: this
            // leaves the site instead of handing over a file, and the E2E spec
            // counts release assets via `a[download]`.
            case "external":
              return (
                <li key={channel.url}>
                  <a
                    href={channel.url}
                    className="btn btn-ghost download-card__btn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLinkIcon />
                    {channel.label}
                  </a>
                </li>
              );
            case "command":
              return (
                <li key={channel.command}>
                  <CommandChannelRow channel={channel} />
                </li>
              );
          }
        })}
      </ul>

      <InstallInstructions os={os} />
    </div>
  );
}
