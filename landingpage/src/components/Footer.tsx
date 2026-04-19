import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandMark, GithubIcon, RssIcon } from "./icons";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap footer-inner">
        <div className="footer-row">
          <div className="footer-brand">
            <a href="#" className="brand">
              <span className="brand-mark">
                <BrandMark />
              </span>
              Recrest
            </a>
            <p>{t("footer.tagline")}</p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>{t("footer.columns.product")}</h4>
              <a href="#privacy">{t("footer.links.overview")}</a>
              <a href="#privacy">{t("footer.links.privacy")}</a>
              <a href="#download">{t("footer.links.download")}</a>
            </div>
            <div className="footer-col">
              <h4>{t("footer.columns.project")}</h4>
              <a href={__REPO_URL__} target="_blank" rel="noreferrer noopener">
                {t("footer.links.github")}
              </a>
              <a href={`${__REPO_URL__}#roadmap`} target="_blank" rel="noreferrer noopener">
                {t("footer.links.roadmap")}
              </a>
              <a href={`${__REPO_URL__}/issues`} target="_blank" rel="noreferrer noopener">
                {t("footer.links.issues")}
              </a>
              <a href={`${__REPO_URL__}/discussions`} target="_blank" rel="noreferrer noopener">
                {t("footer.links.discussions")}
              </a>
            </div>
            <div className="footer-col">
              <h4>{t("footer.columns.legal")}</h4>
              <a href="#/legal/imprint">{t("legal.nav.imprint")}</a>
              <a href="#/legal/privacy-policy">{t("legal.nav.privacyPolicy")}</a>
              <a href="#/legal/accessibility">{t("legal.nav.accessibility")}</a>
              <a
                href={`${__REPO_URL__}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("footer.links.license")}
              </a>
              <a
                href={`${__REPO_URL__}/graphs/contributors`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("footer.links.credits")}
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{t("footer.copyright", { year, version: __APP_VERSION__ })}</span>
          <div className="footer-bottom-right">
            <LanguageSwitcher />
            <div className="footer-social">
              <a
                href={__REPO_URL__}
                className="icon-btn"
                aria-label="GitHub"
                target="_blank"
                rel="noreferrer noopener"
              >
                <GithubIcon />
              </a>
              <a
                href={`${__REPO_URL__}/releases.atom`}
                className="icon-btn"
                aria-label="Release feed"
                target="_blank"
                rel="noreferrer noopener"
              >
                <RssIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
