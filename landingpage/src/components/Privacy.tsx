import type { ComponentType, SVGProps } from "react";

import { useTranslation } from "react-i18next";

import { DataFlow } from "./DataFlow";
import { CloudOffIcon, FeatherIcon, KeyIcon, ShieldOffIcon } from "./icons";

type BulletKey = "noServers" | "keychain" | "native" | "offline";

const BULLETS: Array<{ key: BulletKey; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { key: "noServers", Icon: ShieldOffIcon },
  { key: "keychain", Icon: KeyIcon },
  { key: "native", Icon: FeatherIcon },
  { key: "offline", Icon: CloudOffIcon },
];

export function Privacy() {
  const { t } = useTranslation();

  return (
    <section id="privacy">
      <div className="wrap">
        <div className="privacy-v2 reveal">
          <div className="privacy-head">
            <span className="section-eyebrow">{t("privacy.eyebrow")}</span>
            <h2>{t("privacy.title")}</h2>
            <p>{t("privacy.body")}</p>

            <div className="privacy-stats" role="list">
              <div className="privacy-stat" role="listitem">
                <span className="privacy-stat-value">12 MB</span>
                <span className="privacy-stat-label">{t("privacy.stats.bundle")}</span>
              </div>
              <div className="privacy-stat" role="listitem">
                <span className="privacy-stat-value">&lt; 80 MB</span>
                <span className="privacy-stat-label">{t("privacy.stats.ram")}</span>
              </div>
              <div className="privacy-stat" role="listitem">
                <span className="privacy-stat-value">0 B</span>
                <span className="privacy-stat-label">{t("privacy.stats.telemetry")}</span>
              </div>
            </div>
          </div>

          <DataFlow className="privacy-flow" />

          <div className="privacy-cards">
            {BULLETS.map(({ key, Icon }) => (
              <article className="privacy-card" key={key}>
                <div className="privacy-card-ico">
                  <Icon />
                </div>
                <strong>{t(`privacy.bullets.${key}.title`)}</strong>
                <span>{t(`privacy.bullets.${key}.body`)}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
