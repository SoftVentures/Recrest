import { type ReactNode, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type GitInfo, type PlatformInfo, TauriCommand } from "@recrest/shared";

import { Bug, ExternalLink, FileText, Github as GithubIcon, Scale } from "lucide-react";

import { invoke, isTauri, openExternal } from "@/lib/tauri";

const GITHUB_URL = "https://github.com/SoftVentures/Recrest";
const ISSUES_URL = "https://github.com/SoftVentures/Recrest/issues";
const LICENSES_URL = "https://github.com/SoftVentures/Recrest/blob/main/LICENSE";

const Section = styled("section")({
  marginBottom: 22,
});

const SectionLabel = styled("h3")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
}));

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
}));

const FactKey = styled("div")(({ theme }) => ({
  flex: 1,
  fontSize: 12.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

const FactVal = styled("div", { shouldForwardProp: (p) => p !== "mono" })<{ mono?: boolean }>(
  ({ theme, mono }) => ({
    fontSize: 12,
    color: theme.palette.text.information,
    fontFamily: mono
      ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
      : "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }),
);

const LinkRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
}));

const LinkLeft = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const LinkTitle = styled("div")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const LinkUrl = styled("div")(({ theme }) => ({
  marginTop: 2,
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const OpenBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

interface AppMeta {
  name: string;
  version: string;
  tauriVersion: string | null;
}

const DASH = "—";

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

function formatBuildTime(iso: string | undefined): string {
  if (!iso) return DASH;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}

function gitDescription(info: GitInfo | null): string {
  if (!info || !info.installed) return "not installed";
  const version = info.version ?? "installed";
  return info.path ? `${version} · ${info.path}` : version;
}

interface FactRowSpec {
  key: string;
  value: ReactNode;
  mono?: boolean;
}

export function AboutSection() {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [git, setGit] = useState<GitInfo | null>(null);

  useEffect(() => {
    void loadAppMeta().then(setMeta);
    if (isTauri()) {
      invoke<PlatformInfo>(TauriCommand.GET_PLATFORM_INFO)
        .then(setPlatform)
        .catch(() => setPlatform(null));
      invoke<GitInfo>(TauriCommand.CHECK_GIT)
        .then(setGit)
        .catch(() => setGit(null));
    }
  }, []);

  const buildSha = typeof __GIT_SHA__ === "string" && __GIT_SHA__.length > 0 ? __GIT_SHA__ : DASH;
  const buildTime = formatBuildTime(
    typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : undefined,
  );

  const rows: FactRowSpec[] = [
    {
      key: t("settings.about.app_version", { defaultValue: "Application" }),
      value: meta ? `${meta.name} ${meta.version}` : DASH,
    },
    {
      key: t("settings.about.tauri_version", { defaultValue: "Tauri runtime" }),
      value: meta?.tauriVersion ?? DASH,
    },
    {
      key: t("settings.about.repository", { defaultValue: "Repository" }),
      value: "SoftVentures/Recrest",
      mono: true,
    },
    {
      key: t("settings.about.commit", { defaultValue: "Commit" }),
      value: buildSha,
      mono: true,
    },
    {
      key: t("settings.about.build_time", { defaultValue: "Build time" }),
      value: buildTime,
      mono: true,
    },
    {
      key: t("settings.about.os", { defaultValue: "Operating system" }),
      value: platform ? `${platform.os} ${platform.version}` : DASH,
    },
    {
      key: t("settings.about.arch", { defaultValue: "Architecture" }),
      value: platform?.arch ?? DASH,
      mono: true,
    },
    {
      key: t("settings.about.git", { defaultValue: "System git" }),
      value: gitDescription(git),
    },
    {
      key: t("settings.about.license", { defaultValue: "License" }),
      value: (
        <>
          <Scale size={11} />
          <span>MIT</span>
        </>
      ),
    },
    {
      key: t("settings.about.build_mode", { defaultValue: "Build" }),
      value: import.meta.env.DEV ? "development" : "release",
    },
  ];

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  return (
    <>
      <Section>
        <SectionLabel>{t("settings.about.version", { defaultValue: "Version" })}</SectionLabel>
        <Card>
          {rows.map((r) => (
            <FactRow key={r.key}>
              <FactKey>{r.key}</FactKey>
              <FactVal mono={r.mono}>{r.value}</FactVal>
            </FactRow>
          ))}
        </Card>
      </Section>

      <Section>
        <SectionLabel>{t("settings.about.links_title", { defaultValue: "Links" })}</SectionLabel>
        <Card>
          <LinkRow>
            <LinkLeft>
              <LinkTitle>
                <GithubIcon size={13} />
                {t("settings.about.link_github", { defaultValue: "Source code" })}
              </LinkTitle>
              <LinkUrl>{GITHUB_URL}</LinkUrl>
            </LinkLeft>
            <OpenBtn type="button" onClick={() => openUrl(GITHUB_URL)}>
              <ExternalLink size={11} />
              Open
            </OpenBtn>
          </LinkRow>
          <LinkRow>
            <LinkLeft>
              <LinkTitle>
                <Bug size={13} />
                {t("settings.about.link_issues", { defaultValue: "Report a bug" })}
              </LinkTitle>
              <LinkUrl>{ISSUES_URL}</LinkUrl>
            </LinkLeft>
            <OpenBtn type="button" onClick={() => openUrl(ISSUES_URL)}>
              <ExternalLink size={11} />
              Open
            </OpenBtn>
          </LinkRow>
          <LinkRow>
            <LinkLeft>
              <LinkTitle>
                <FileText size={13} />
                {t("settings.about.link_licenses", { defaultValue: "License" })}
              </LinkTitle>
              <LinkUrl>MIT</LinkUrl>
            </LinkLeft>
            <OpenBtn type="button" onClick={() => openUrl(LICENSES_URL)}>
              <ExternalLink size={11} />
              Open
            </OpenBtn>
          </LinkRow>
        </Card>
      </Section>
    </>
  );
}
