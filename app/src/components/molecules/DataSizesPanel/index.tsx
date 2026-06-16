import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type DataSizes, TauriCommand } from "@recrest/shared";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { formatBytes } from "@/lib/utils/format.utils";

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.primary,
  padding: "10px 16px",
  "& strong": {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  "& span": {
    color: theme.palette.text.information,
    fontFamily: MONO_STACK,
  },
})) as typeof Box;

const FactsBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  "& > div + div": { borderTop: `1px solid ${theme.palette.divider}` },
})) as typeof Box;

interface DataSizesPanelProps {
  initialSizes?: DataSizes;
}

export function DataSizesPanel({ initialSizes }: DataSizesPanelProps = {}) {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const [sizes, setSizes] = useState<DataSizes | null>(initialSizes ?? null);

  useEffect(() => {
    if (initialSizes) return;
    if (!isTauri()) return;
    let cancelled = false;
    invoke<DataSizes>(TauriCommand.GET_DATA_SIZES)
      .then((result) => {
        if (!cancelled) setSizes(result);
      })
      .catch(() => {
        // Best-effort surface — leave `sizes` null so the panel falls back
        // to "—" rows instead of throwing into the renderer.
      });
    return () => {
      cancelled = true;
    };
  }, [initialSizes]);

  const settingsValue = sizes ? formatBytes(sizes.settingsBytes) : "—";
  const cacheValue = sizes ? formatBytes(sizes.cacheBytes) : "—";
  const tokensValue = sizes ? formatBytes(sizes.tokensBytes) : "—";
  // dev-tokens.json only exists in debug/demo builds; in release the row
  // would always read "0 B", which is just confusing UX.
  const showTokensRow = import.meta.env.DEV || import.meta.env.MODE === "demo";

  return (
    <FactsBox data-testid={TEST_IDS.settings.storage.dataSizesPanel}>
      <FactRow data-testid={TEST_IDS.settings.storage.dataSizesSettings}>
        <Box component="strong">{t("storage.facts.settings")}:</Box>
        <Box component="span">{settingsValue}</Box>
      </FactRow>
      <FactRow data-testid={TEST_IDS.settings.storage.dataSizesCache}>
        <Box component="strong">{t("storage.facts.cache")}:</Box>
        <Box component="span">{cacheValue}</Box>
      </FactRow>
      {showTokensRow && (
        <FactRow data-testid={TEST_IDS.settings.storage.dataSizesTokens}>
          <Box component="strong">{t("storage.facts.tokens")}:</Box>
          <Box component="span">{tokensValue}</Box>
        </FactRow>
      )}
    </FactsBox>
  );
}

export default DataSizesPanel;
