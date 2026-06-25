import { type KeyboardEvent, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type PagesStatus, TauriCommand } from "@recrest/shared";

import { ExternalLink, Globe } from "lucide-react";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";

interface Props {
  repoId: string;
}

type DeployTone = "building" | "built" | "errored" | "disabled";

const STATUS_KEY: Record<DeployTone, string> = {
  building: "deployments.status_building",
  built: "deployments.status_built",
  errored: "deployments.status_errored",
  disabled: "deployments.status_disabled",
};

const STATUS_TONE = {
  building: StatusTone.WARNING,
  built: StatusTone.SUCCESS,
  errored: StatusTone.ERROR,
} as const satisfies Record<Exclude<DeployTone, "disabled">, StatusTone>;

const DEPLOY_TONES: readonly DeployTone[] = ["building", "built", "errored", "disabled"];

/** Hostname for the headline; falls back to the raw string if unparseable. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Renders only when the provider reports a Pages/deploy status. Returns null
 *  otherwise so the parent grid doesn't show an empty card. */
export default function DeploymentsCard({ repoId }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const dt = useDateTimeFormat();
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

  const tone: DeployTone = DEPLOY_TONES.includes(pages.status as DeployTone)
    ? (pages.status as DeployTone)
    : "built";
  // Bitbucket's pipelines-based detection reports `built` with no URL — show
  // the explanatory note instead of a dead "Visit" affordance.
  const pipelinesOnly = pages.status === "built" && !pages.url;
  const open = pages.url ? () => void openExternal(pages.url!) : undefined;
  const headline = pages.url ? (pages.customDomain ?? hostOf(pages.url)) : null;

  return (
    <GeneralCard padding="14px 16px">
      <Root data-testid={TEST_IDS.deployments.block}>
        <Head>
          <Globe size={14} />
          <HeadTitle>{t("deployments.title")}</HeadTitle>
          <StatusBadge tone={tone} data-testid={TEST_IDS.deployments.status}>
            {t(STATUS_KEY[tone])}
          </StatusBadge>
        </Head>

        {pipelinesOnly ? (
          <Note>{t("deployments.pipelines_detected")}</Note>
        ) : open && pages.url ? (
          <UrlCard
            role="button"
            tabIndex={0}
            aria-label={t("deployments.visit_aria", { url: headline ?? pages.url })}
            data-testid={TEST_IDS.deployments.link}
            onClick={open}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
                e.preventDefault();
                open();
              }
            }}
          >
            <UrlIcon>
              <Globe size={16} />
            </UrlIcon>
            <UrlMain>
              <UrlHost>{headline}</UrlHost>
              <UrlFull>{pages.url}</UrlFull>
            </UrlMain>
            <ExternalLink size={14} />
          </UrlCard>
        ) : null}

        {!pipelinesOnly && pages.lastDeployedAt && (
          <Note>
            {t("deployments.last_deployed", { when: dt.formatTimestamp(pages.lastDeployedAt) })}
          </Note>
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

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed tone prop
const StatusBadge = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: DeployTone;
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 7px",
  borderRadius: 100,
  // `disabled` isn't a health state — render it muted-neutral rather than
  // borrowing a status hue.
  ...(tone === "disabled"
    ? {
        color: theme.palette.text.informationLight,
        backgroundColor: theme.palette.surface.interface.backElevation,
      }
    : toneChip(theme, STATUS_TONE[tone])),
}));

const UrlCard = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.information,
  cursor: "pointer",
  transition: "background-color 120ms ease, border-color 120ms ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
  'html[data-reduced-motion="true"] &': { transition: "none" },
})) as typeof Box;

const UrlIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  flexShrink: 0,
  color: theme.palette.primary.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 12%, transparent)`,
})) as typeof Box;

const UrlMain = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const UrlHost = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const UrlFull = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const Note = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Typography;
