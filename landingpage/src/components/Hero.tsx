import { Trans, useTranslation } from "react-i18next";

import { DownloadButton } from "./DownloadButton";
import { HeroDemo } from "./HeroDemo";
import {
  BitbucketIcon,
  CheckSmallIcon,
  GithubIcon,
  GitlabIcon,
  LaptopIcon,
  LockIcon,
} from "./icons";

export function Hero() {
  const { t } = useTranslation();

  return (
    <header className="hero">
      <div className="wrap">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          <span>
            <Trans
              i18nKey="hero.eyebrow"
              values={{ version: __APP_VERSION__ }}
              components={{
                0: <strong />,
              }}
            >
              <strong>v{__APP_VERSION__}</strong> — Bitbucket support added
            </Trans>
          </span>
        </div>

        <h1 className="hero-title">
          {t("hero.titleLine1")}
          <br />
          <span className="accent">{t("hero.titleLine2")}</span>
        </h1>

        <p className="hero-sub">
          <Trans
            i18nKey="hero.sub"
            components={{
              1: <strong />,
              3: <strong />,
              5: <strong />,
              7: <strong />,
            }}
          />
        </p>

        <div className="hero-cta" id="download">
          <DownloadButton />
          <a
            href={__REPO_URL__}
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer noopener"
          >
            <GithubIcon width={14} height={14} />
            {t("hero.starOnGithub")}
          </a>
        </div>

        <div className="hero-version-hint">
          <Trans
            i18nKey="hero.versionHint"
            values={{ version: __APP_VERSION__ }}
            components={{
              1: <a href={`${__REPO_URL__}/releases`} target="_blank" rel="noreferrer noopener" />,
            }}
          />
        </div>

        <div className="hero-meta">
          <span>
            <LaptopIcon />
            {t("hero.metaPlatforms")}
          </span>
          <span>
            <CheckSmallIcon />
            {t("hero.metaFoss")}
          </span>
          <span>
            <LockIcon />
            {t("hero.metaLocal")}
          </span>
        </div>

        <div className="remotes">
          <span className="remotes-label">{t("hero.worksWith")}</span>
          <span className="remote-logo">
            <GithubIcon width={20} height={20} />
            GitHub
          </span>
          <span className="remote-logo">
            <GitlabIcon />
            GitLab
          </span>
          <span className="remote-logo">
            <BitbucketIcon />
            Bitbucket
          </span>
        </div>
      </div>

      <HeroDemo />
    </header>
  );
}
