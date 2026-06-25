import { Trans, useTranslation } from "react-i18next";

import {
  CodeBracketsIcon,
  GitPullRequestIcon,
  GithubIcon,
  HelpCircleIcon,
  MessageIcon,
  RustIcon,
  ScaleIcon,
  TypeScriptIcon,
} from "./icons";

const WAYS = [
  { key: "issue", href: `${__REPO_URL__}/issues/new/choose`, Icon: HelpCircleIcon },
  { key: "pr", href: `${__REPO_URL__}/pulls`, Icon: CodeBracketsIcon },
  { key: "discussion", href: `${__REPO_URL__}/discussions`, Icon: MessageIcon },
] as const;

export function Contribute() {
  const { t } = useTranslation();

  return (
    <section id="contribute" className="tight">
      <div className="wrap">
        <div className="contribute reveal">
          <span className="os-label">{t("contribute.eyebrow")}</span>
          <h2>
            <Trans i18nKey="contribute.title" components={{ 1: <span className="ac" /> }} />
          </h2>
          <p>{t("contribute.body")}</p>

          <div className="contrib-facts" role="list">
            <span className="contrib-fact" role="listitem">
              <ScaleIcon width={13} height={13} />
              {t("contribute.facts.license")}
            </span>
            <span className="contrib-fact" role="listitem">
              <span className="contrib-fact-tech">
                <RustIcon width={13} height={13} />
                Rust
              </span>
              <span className="contrib-fact-sep">+</span>
              <span className="contrib-fact-tech">
                <TypeScriptIcon width={13} height={13} />
                TypeScript
              </span>
            </span>
            <span className="contrib-fact" role="listitem">
              <GitPullRequestIcon width={13} height={13} />
              {t("contribute.facts.prs")}
            </span>
          </div>

          <div className="hero-cta" style={{ marginTop: 8 }}>
            <a
              href={__REPO_URL__}
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer noopener"
            >
              <GithubIcon width={14} height={14} />
              {t("contribute.ctaContribute")}
            </a>
            <a
              href={`${__REPO_URL__}/blob/main/ROADMAP.md`}
              className="btn btn-ghost"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("contribute.ctaRoadmap")}
            </a>
          </div>

          <div className="contrib-ways">
            {WAYS.map(({ key, href, Icon }, i) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className={`contrib-way reveal reveal-delay-${i + 1}`}
              >
                <div className="cw-ico">
                  <Icon />
                </div>
                <strong>{t(`contribute.ways.${key}.title`)}</strong>
                <span>{t(`contribute.ways.${key}.body`)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
