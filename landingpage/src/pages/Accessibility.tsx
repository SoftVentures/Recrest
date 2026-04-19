import { Trans, useTranslation } from "react-i18next";

import { loadImprint } from "@recrest/shared";

export function Accessibility() {
  const { t } = useTranslation();
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
        <h2>{t("legal.accessibility.scope")}</h2>
        <p>{t("legal.accessibility.scopeBody")}</p>
      </section>

      <section>
        <h2>{t("legal.accessibility.known")}</h2>
        <p>
          <Trans i18nKey="legal.accessibility.knownBody" components={[<code key="rm" />]} />
        </p>
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

      <section>
        <h2>{t("legal.accessibility.enforcement")}</h2>
        <p>
          <Trans
            i18nKey="legal.accessibility.enforcementBody"
            components={[
              <a
                key="bgg"
                href="https://www.schlichtungsstelle-bgg.de/"
                target="_blank"
                rel="noreferrer noopener"
              />,
            ]}
          />
        </p>
      </section>
    </>
  );
}
