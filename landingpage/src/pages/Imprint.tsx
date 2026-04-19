import { Trans, useTranslation } from "react-i18next";

import { IMPRINT_ENV_KEYS, loadImprint } from "@recrest/shared";

export function Imprint() {
  const { t } = useTranslation();
  const result = loadImprint(import.meta.env as unknown as Record<string, string | undefined>);

  if (!result.ok) {
    return (
      <>
        <header className="legal-header">
          <h1>{t("legal.imprint.title")}</h1>
          <p className="legal-subtitle">{t("legal.imprint.subtitle")}</p>
        </header>
        <div className="legal-missing" role="note">
          <strong>{t("legal.imprint.missing.title")}</strong>
          <p>
            <Trans
              i18nKey="legal.imprint.missing.body"
              values={{ keys: result.error.missing.join(", ") }}
            />
          </p>
        </div>
      </>
    );
  }

  const { imprint } = result;

  return (
    <>
      <header className="legal-header">
        <h1>{t("legal.imprint.title")}</h1>
        <p className="legal-subtitle">{t("legal.imprint.subtitle")}</p>
      </header>

      <section>
        <h2>{t("legal.imprint.sections.provider")}</h2>
        <address className="legal-address">
          <div>{imprint.name}</div>
          <div>{imprint.street}</div>
          <div>
            {imprint.postalCode} {imprint.city}
          </div>
          <div>{imprint.country}</div>
        </address>
      </section>

      <section>
        <h2>{t("legal.imprint.sections.contact")}</h2>
        <ul className="legal-kv">
          <li>
            <span>E-Mail:</span> <a href={`mailto:${imprint.email}`}>{imprint.email}</a>
          </li>
          {imprint.phone ? (
            <li>
              <span>Tel.:</span>{" "}
              <a href={`tel:${imprint.phone.replace(/\s/g, "")}`}>{imprint.phone}</a>
            </li>
          ) : null}
        </ul>
      </section>

      {imprint.responsiblePerson ? (
        <section>
          <h2>{t("legal.imprint.sections.responsible")}</h2>
          <p>
            {imprint.responsiblePerson}
            <br />
            {imprint.street}
            <br />
            {imprint.postalCode} {imprint.city}
          </p>
        </section>
      ) : null}

      <section>
        <h2>{t("legal.imprint.sections.liability")}</h2>
        <p>{t("legal.imprint.liabilityBody")}</p>
      </section>

      <section>
        <h2>{t("legal.imprint.sections.disclaimer")}</h2>
        <p>{t("legal.imprint.disclaimerBody")}</p>
      </section>

      <p className="legal-note" aria-hidden="true" hidden>
        {IMPRINT_ENV_KEYS.name /* keep type reference for tree-shaking */}
      </p>
    </>
  );
}
