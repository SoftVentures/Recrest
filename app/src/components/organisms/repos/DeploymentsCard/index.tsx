import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type PagesStatus, TauriCommand } from "@recrest/shared";

import { ExternalLink, Globe } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { timeAgo } from "@/lib/utils/timeAgo.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";

interface Props {
  repoId: string;
}

const STATUS_KEY: Record<string, string> = {
  building: "deployments.status_building",
  built: "deployments.status_built",
  errored: "deployments.status_errored",
  disabled: "deployments.status_disabled",
};

/** Renders only when the provider reports a Pages/deploy status. Returns null
 *  otherwise so the parent grid doesn't show an empty card. */
export default function DeploymentsCard({ repoId }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [pages, setPages] = useState<PagesStatus | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void (async () => {
      try {
        const status = await invoke<PagesStatus | null>(TauriCommand.GET_PAGES_STATUS, { repoId });
        if (!cancelled) setPages(status);
      } catch {
        if (!cancelled) setPages(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  if (!pages) return null;

  const statusKey = STATUS_KEY[pages.status] ?? "deployments.status_built";
  // Bitbucket's pipelines-based detection reports `built` with no URL — show
  // the explanatory note instead of a dead "Visit" affordance.
  const pipelinesOnly = pages.status === "built" && !pages.url;

  return (
    <GeneralCard padding="14px 16px">
      <Root data-testid={TEST_IDS.deployments.block}>
        <Head>
          <Globe size={14} />
          <HeadTitle>{t("deployments.title")}</HeadTitle>
          <StatusBadge component="span" data-testid={TEST_IDS.deployments.status}>
            {t(statusKey)}
          </StatusBadge>
        </Head>

        {pipelinesOnly ? (
          <Note>{t("deployments.pipelines_detected")}</Note>
        ) : (
          <>
            {pages.url && (
              <GeneralButton
                variant="outline"
                onClick={() => void openExternal(pages.url!)}
                data-testid={TEST_IDS.deployments.link}
              >
                <ExternalLink size={12} />
                <Box component="span">{pages.customDomain ?? t("deployments.visit")}</Box>
              </GeneralButton>
            )}
            {pages.lastDeployedAt && (
              <Note>{t("deployments.last_deployed", { when: timeAgo(pages.lastDeployedAt) })}</Note>
            )}
          </>
        )}
      </Root>
    </GeneralCard>
  );
}

const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
}) as typeof Box;

const Head = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

const HeadTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  flex: 1,
})) as typeof Typography;

const StatusBadge = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 7px",
  borderRadius: 100,
  color: toneText(theme, StatusTone.SUCCESS),
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Typography;

const Note = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Typography;
