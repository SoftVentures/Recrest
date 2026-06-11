import { Trans, useTranslation } from "react-i18next";

import { loadImprint } from "@recrest/shared";

import { LEGAL_LAST_REVIEWED, formatLegalDate } from "../lib/legal";

export function Accessibility() {
  const { t, i18n } = useTranslation();
  const result = loadImprint(import.meta.env as unknown as Record<string, string | undefined>);
  const email = result.ok ? result.imprint.email : "accessibility@example.com";

  return (
    <>
      <header className="legal-header">
        <h1>{t("legal.accessibility.title")}</h1>
        <p className="legal-subtitle">{t("legal.accessibility.subtitle")}</p>
      </header>

      <section>
        <h2>{t("legal.accessibility.status")}</h2>
        <p>
          <Trans
            i18nKey="legal.accessibility.statusBody"
            components={[
              <a
                key="wcag"
                href="https://www.w3.org/TR/WCAG21/"
                target="_blank"
                rel="noreferrer noopener"
              />,
            ]}
          />
        </p>
      </section>

      <section>
        <h2>{t("legal.accessibility.features")}</h2>
        <p>{t("legal.accessibility.featuresIntro")}</p>
        <ul className="legal-features">
          <li>{t("legal.accessibility.featureList.dyslexia")}</li>
          <li>{t("legal.accessibility.featureList.contrast")}</li>
          <li>{t("legal.accessibility.featureList.motion")}</li>
          <li>{t("legal.accessibility.featureList.underline")}</li>
          <li>{t("legal.accessibility.featureList.scale")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("legal.accessibility.scope")}</h2>
        <p>{t("legal.accessibility.scopeBody")}</p>
      </section>

      <section>
        <h2>{t("legal.accessibility.known")}</h2>
        <p>{t("legal.accessibility.knownBody")}</p>
      </section>

      <section>
        <h2>{t("legal.accessibility.legal")}</h2>
        <p>{t("legal.accessibility.legalBody")}</p>
      </section>

      <section>
        <h2>{t("legal.accessibility.feedback")}</h2>
        <p>
          <Trans
            i18nKey="legal.accessibility.feedbackBody"
            values={{ email }}
            components={[<a key="mail" href={`mailto:${email}`} />]}
          />
        </p>
      </section>

      <p className="legal-updated">
        {t("legal.accessibility.created", {
          date: formatLegalDate(LEGAL_LAST_REVIEWED, i18n.language),
        })}
      </p>
    </>
  );
}
