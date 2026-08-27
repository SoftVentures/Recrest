import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import type { CommandChannel } from "../../../../lib/downloadUrl";
import { CheckSmallIcon, CopyIcon } from "../../../icons";

type Props = {
  channel: CommandChannel;
};

const COPIED_RESET_MS = 2000;

export function CommandChannelRow({ channel }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // `navigator.clipboard` is undefined outside secure contexts, and its write
  // can be rejected by permissions policy. Either way the command stays visible
  // and selectable, so a failed copy is a non-event — swallow it rather than
  // flashing a confirmation the user never earned.
  const handleCopy = () => {
    void navigator.clipboard
      ?.writeText(channel.command)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  return (
    <div className="download-card__cmd">
      <span className="download-card__cmd-label">{channel.label}</span>
      <div className="download-card__cmd-row">
        <code className="download-card__cmd-text">{channel.command}</code>
        <button
          type="button"
          className="download-card__cmd-copy"
          onClick={handleCopy}
          aria-label={t("download.copyCommand")}
        >
          {copied ? <CheckSmallIcon /> : <CopyIcon />}
          {copied ? t("download.copied") : t("download.copy")}
        </button>
      </div>
    </div>
  );
}
