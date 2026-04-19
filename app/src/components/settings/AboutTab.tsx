import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import type { GitInfo, PlatformInfo } from "@recrest/shared";

import { Icon } from "@/components/icons/Icon";
import { useGitInfo } from "@/hooks/useGitInfo";
import { isTauri, openExternal } from "@/lib/tauri";
import { systemService } from "@/lib/tauri/services";

const GITHUB_URL = "https://github.com/SoftVentures/Recrest";
const ISSUES_URL = "https://github.com/SoftVentures/Recrest/issues";
const LICENSES_URL = "https://github.com/SoftVentures/Recrest/blob/main/LICENSE";

interface AppMeta {
  name: string;
  version: string;
  tauriVersion: string | null;
}

async function loadAppMeta(): Promise<AppMeta> {
  if (!isTauri()) {
    return { name: "Recrest", version: "web-dev", tauriVersion: null };
  }
  try {
    const app = await import("@tauri-apps/api/app");
    const [version, name, tauriVersion] = await Promise.all([
      app.getVersion(),
      app.getName(),
      app.getTauriVersion(),
    ]);
    return { name, version, tauriVersion };
  } catch {
    return { name: "Recrest", version: "unknown", tauriVersion: null };
  }
}

export function AboutTabBody() {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const git: ReturnType<typeof useGitInfo> = useGitInfo();

  useEffect(() => {
    void loadAppMeta().then(setMeta);
    void systemService.getPlatformInfo().then(setPlatform);
  }, []);

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    {
      label: t("settings.about.app_version", { defaultValue: "Application" }),
      value: meta ? `${meta.name} ${meta.version}` : "—",
    },
    {
      label: t("settings.about.tauri_version", { defaultValue: "Tauri runtime" }),
      value: meta?.tauriVersion ?? "—",
    },
    {
      label: t("settings.about.repository", { defaultValue: "Repository" }),
      value: "SoftVentures/Recrest",
      mono: true,
    },
    {
      label: t("settings.about.commit", { defaultValue: "Commit" }),
      value: __GIT_SHA__,
      mono: true,
    },
    {
      label: t("settings.about.build_time", { defaultValue: "Build time" }),
      value: formatBuildTime(__BUILD_TIME__),
      mono: true,
    },
    {
      label: t("settings.about.os", { defaultValue: "Operating system" }),
      value: platform ? `${platform.os} ${platform.version}` : "—",
    },
    {
      label: t("settings.about.arch", { defaultValue: "Architecture" }),
      value: platform?.arch ?? "—",
      mono: true,
    },
    {
      label: t("settings.about.git", { defaultValue: "System git" }),
      value: gitDescription(git, t),
    },
    {
      label: t("settings.about.license", { defaultValue: "License" }),
      value: "MIT",
    },
    {
      label: t("settings.about.build_mode", { defaultValue: "Build" }),
      value: import.meta.env.DEV ? "development" : "release",
    },
  ];

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.about.title")}</h2>
        <p>{t("settings.about.intro")}</p>
      </div>

      <section className="a-set-section">
        <h3>{t("settings.about.version")}</h3>
        <div className="a-set-card">
          {rows.map((r) => (
            <div key={r.label} className="a-set-row">
              <div className="a-set-row-l">
                <div className="a-set-row-lbl">{r.label}</div>
              </div>
              <div
                className="a-set-row-r"
                style={{
                  fontFamily: r.mono ? "var(--font-mono)" : undefined,
                  fontSize: 12.5,
                  color: "var(--ink-1)",
                }}
              >
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="a-set-section">
        <h3>{t("settings.about.links_title", { defaultValue: "Links" })}</h3>
        <div className="a-set-card">
          <AboutLinkRow
            label={t("settings.about.link_github", { defaultValue: "Source code" })}
            sub={GITHUB_URL}
            iconName="github"
            onOpen={() => openUrl(GITHUB_URL)}
          />
          <AboutLinkRow
            label={t("settings.about.link_issues", { defaultValue: "Report a bug" })}
            sub={ISSUES_URL}
            iconName="inbox"
            onOpen={() => openUrl(ISSUES_URL)}
          />
          <AboutLinkRow
            label={t("settings.about.link_licenses", { defaultValue: "License" })}
            sub="MIT"
            iconName="box"
            onOpen={() => openUrl(LICENSES_URL)}
          />
        </div>
      </section>
    </div>
  );
}

function AboutLinkRow({
  label,
  sub,
  iconName,
  onOpen,
}: {
  label: string;
  sub: string;
  iconName: Parameters<typeof Icon>[0]["name"];
  onOpen: () => void;
}) {
  return (
    <div className="a-set-row">
      <div className="a-set-row-l">
        <div className="a-set-row-lbl" style={{ gap: 8 }}>
          <Icon name={iconName} size={13} />
          {label}
        </div>
        <div className="a-set-row-sub" style={{ fontFamily: "var(--font-mono)" }}>
          {sub}
        </div>
      </div>
      <div className="a-set-row-r">
        <button type="button" className="r-btn" onClick={onOpen}>
          <Icon name="external" size={12} />
          Open
        </button>
      </div>
    </div>
  );
}

function formatBuildTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}

function gitDescription(
  git: ReturnType<typeof useGitInfo>,
  t: (k: string, p?: Record<string, unknown>) => string,
): string {
  if (git.status === "loading") return "…";
  const info: GitInfo | null = git.info ?? null;
  if (!info || !info.installed)
    return t("settings.about.git_missing", { defaultValue: "not installed" });
  const version = info.version ?? t("settings.about.git_installed", { defaultValue: "installed" });
  return info.path ? `${version} · ${info.path}` : version;
}
