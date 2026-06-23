import { Fragment } from "react";

import { useTranslation } from "react-i18next";

import type { Os } from "../../hooks/useOsDetect";

type Props = {
  os: Exclude<Os, "unknown">;
};

// Render backtick-delimited spans as inline <code>. This keeps the i18n step
// strings plain (no <Trans> component wiring) while still styling shell
// commands monospaced via `.install-instructions__steps code`.
function renderStep(step: string) {
  return step
    .split("`")
    .map((part, i) =>
      i % 2 === 1 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>,
    );
}

export function InstallInstructions({ os }: Props) {
  const { t } = useTranslation();

  // `returnObjects` yields the step array; if the key is ever missing i18next
  // returns the key string instead, so guard before mapping.
  const raw = t(`download.install.${os}`, { returnObjects: true });
  const steps: string[] = Array.isArray(raw) ? (raw as string[]) : [];

  return (
    <div className="install-instructions">
      <p className="install-instructions__heading">{t("download.install.heading")}</p>
      <ol className="install-instructions__steps">
        {steps.map((step) => (
          <li key={step}>{renderStep(step)}</li>
        ))}
      </ol>
    </div>
  );
}
