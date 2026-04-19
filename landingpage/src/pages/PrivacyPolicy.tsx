import { Trans, useTranslation } from "react-i18next";

import { loadImprint } from "@recrest/shared";

export function PrivacyPolicy() {
  const { t } = useTranslation();
  const result = loadImprint(import.meta.env as unknown as Record<string, string | undefined>);
  const imprint = result.ok ? result.imprint : null;

  return (
    <>
      <header className="legal-header">
        <h1>{t("legal.privacy.title")}</h1>
        <p className="legal-subtitle">{t("legal.privacy.subtitle")}</p>
      </header>

      <section>
        <p>{t("legal.privacy.intro")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.sections.controller")}</h2>
        {imprint ? (
          <address className="legal-address">
            <div>{imprint.name}</div>
            <div>{imprint.street}</div>
            <div>
              {imprint.postalCode} {imprint.city}
            </div>
            <div>{imprint.country}</div>
            <div>
              <a href={`mailto:${imprint.email}`}>{imprint.email}</a>
            </div>
          </address>
        ) : (
          <p>
            <a href="#/legal/imprint">{t("legal.nav.imprint")}</a>
          </p>
        )}
      </section>

      <section>
        <h2>{t("legal.privacy.sections.hosting")}</h2>
        <p>
          <Trans
            i18nKey="legal.privacy.hostingBody"
            components={[
              <a
                key="github-privacy"
                href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noreferrer noopener"
              />,
            ]}
          />
        </p>
      </section>

      <section>
        <h2>{t("legal.privacy.sections.logs")}</h2>
        <p>{t("legal.privacy.logsBody")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.sections.external")}</h2>
        <p>{t("legal.privacy.externalBody")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.sections.rights")}</h2>
        <p>{t("legal.privacy.rightsBody")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.sections.changes")}</h2>
        <p>{t("legal.privacy.changesBody")}</p>
      </section>
    </>
  );
}
