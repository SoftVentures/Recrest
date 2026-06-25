import { Trans, useTranslation } from "react-i18next";

import { PROVIDER_WEB_URLS } from "@recrest/shared";

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
              <strong>v{__APP_VERSION__}</strong> — Git actions + full GitLab &amp; Bitbucket
              support
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

        <div className="hero-cta">
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
          <a
            className="remote-logo remote-logo-github"
            href={PROVIDER_WEB_URLS.github}
            target="_blank"
            rel="noreferrer noopener"
          >
            <GithubIcon width={20} height={20} />
            GitHub
          </a>
          <a
            className="remote-logo remote-logo-gitlab"
            href={PROVIDER_WEB_URLS.gitlab}
            target="_blank"
            rel="noreferrer noopener"
          >
            <GitlabIcon />
            GitLab
          </a>
          <a
            className="remote-logo remote-logo-bitbucket"
            href={PROVIDER_WEB_URLS.bitbucket}
            target="_blank"
            rel="noreferrer noopener"
          >
            <BitbucketIcon />
            Bitbucket
          </a>
        </div>
      </div>

      <HeroDemo />
    </header>
  );
}
