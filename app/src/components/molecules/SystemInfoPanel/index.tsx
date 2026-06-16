import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type SystemFacts, TauriCommand } from "@recrest/shared";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.primary,
  padding: "10px 16px",
  fontFamily: MONO_STACK,
  "& strong": {
    fontWeight: 600,
    fontFamily: "inherit",
    color: theme.palette.text.primary,
  },
  "& span": { color: theme.palette.text.information },
})) as typeof Box;

const FactsBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  "& > div + div": { borderTop: `1px solid ${theme.palette.divider}` },
})) as typeof Box;

function formatOs(facts: SystemFacts): string {
  const version = facts.osVersion ? ` ${facts.osVersion}` : "";
  return `${facts.os}${version} (${facts.arch})`;
}

interface SystemInfoPanelProps {
  initialFacts?: SystemFacts;
}

export function SystemInfoPanel({ initialFacts }: SystemInfoPanelProps = {}) {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const [facts, setFacts] = useState<SystemFacts | null>(initialFacts ?? null);

  useEffect(() => {
    if (initialFacts) return;
    if (!isTauri()) return;
    let cancelled = false;
    invoke<SystemFacts>(TauriCommand.GET_SYSTEM_FACTS)
      .then((result) => {
        if (!cancelled) setFacts(result);
      })
      .catch(() => {
        // Best-effort surface — leave `facts` null so the panel just shows
        // the static "Recrest vX.Y.Z" row.
      });
    return () => {
      cancelled = true;
    };
  }, [initialFacts]);

  const appFallback = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0"; // audit:ignore-fact — runtime fallback for the __APP_VERSION__ Vite define
  const osValue = facts ? formatOs(facts) : "—";
  const gitValue = facts?.gitVersion ?? "—";
  const appValue = `v${facts?.appVersion ?? appFallback}`;

  return (
    <FactsBox data-testid={TEST_IDS.settings.storage.systemPanel}>
      <FactRow data-testid={TEST_IDS.settings.storage.systemOs}>
        <Box component="strong">{t("system.os")}:</Box>
        <Box component="span">{osValue}</Box>
      </FactRow>
      <FactRow data-testid={TEST_IDS.settings.storage.systemGit}>
        <Box component="strong">{t("system.git")}:</Box>
        <Box component="span">{gitValue}</Box>
      </FactRow>
      <FactRow data-testid={TEST_IDS.settings.storage.systemApp}>
        <Box component="strong">{t("system.app")}:</Box>
        <Box component="span">{appValue}</Box>
      </FactRow>
    </FactsBox>
  );
}

export default SystemInfoPanel;
