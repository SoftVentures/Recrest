import { type ReactNode, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type GitInfo, type PlatformInfo, TauriCommand } from "@recrest/shared";

import { Bug, FileText, Github as GithubIcon, Scale } from "lucide-react";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { formatBuildTime, gitDescription } from "@/lib/utils/about.utils";
import LinkItem from "@/pages/app/Settings/components/AboutTab/parts/LinkItem";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const GITHUB_URL = "https://github.com/SoftVentures/Recrest";
const ISSUES_URL = "https://github.com/SoftVentures/Recrest/issues";
const LICENSES_URL = "https://github.com/SoftVentures/Recrest/blob/main/LICENSE";

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
})) as typeof Box;

const FactKey = styled(Box)(({ theme }) => ({
  flex: 1,
  fontSize: 12.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Box;

const FactVal = styled(Box, { shouldForwardProp: (p) => p !== "mono" })<{ mono?: boolean }>(
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
      key: t("settings.about.app_version"),
      value: meta ? `${meta.name} ${meta.version}` : DASH,
    },
    {
      key: t("settings.about.tauri_version"),
      value: meta?.tauriVersion ?? DASH,
    },
    {
      key: t("settings.about.repository"),
      value: "SoftVentures/Recrest",
      mono: true,
    },
    {
      key: t("settings.about.commit"),
      value: buildSha,
      mono: true,
    },
    {
      key: t("settings.about.build_time"),
      value: buildTime,
      mono: true,
    },
    {
      key: t("settings.about.os"),
      value: platform ? `${platform.os} ${platform.version}` : DASH,
    },
    {
      key: t("settings.about.arch"),
      value: platform?.arch ?? DASH,
      mono: true,
    },
    {
      key: t("settings.about.git"),
      value: gitDescription(git),
    },
    {
      key: t("settings.about.license"),
      value: (
        <>
          <Scale size={11} />
          <Box component="span">MIT</Box>
        </>
      ),
    },
    {
      key: t("settings.about.build_mode"),
      value: import.meta.env.DEV ? "development" : "release",
    },
  ];

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  return (
    <>
      <SettingsSection title={t("settings.about.version")}>
        <GeneralCard padding={0} flushHeight>
          {rows.map((r) => (
            <FactRow key={r.key}>
              <FactKey>{r.key}</FactKey>
              <FactVal mono={r.mono}>{r.value}</FactVal>
            </FactRow>
          ))}
        </GeneralCard>
      </SettingsSection>

      <SettingsSection title={t("settings.about.links_title")}>
        <GeneralCard padding={0} flushHeight>
          <LinkItem
            icon={GithubIcon}
            title={t("settings.about.link_github")}
            url={GITHUB_URL}
            onOpen={() => openUrl(GITHUB_URL)}
          />
          <LinkItem
            icon={Bug}
            title={t("settings.about.link_issues")}
            url={ISSUES_URL}
            onOpen={() => openUrl(ISSUES_URL)}
          />
          <LinkItem
            icon={FileText}
            title={t("settings.about.link_licenses")}
            url="MIT"
            onOpen={() => openUrl(LICENSES_URL)}
          />
        </GeneralCard>
      </SettingsSection>
    </>
  );
}
