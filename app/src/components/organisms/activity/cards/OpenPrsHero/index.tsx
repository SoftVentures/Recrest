import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PrState, type PullRequest } from "@recrest/shared";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface Props {
  prsByRepo: Record<string, readonly PullRequest[]>;
}

const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: pxToRems(12, 14, 10),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
  height: "100%",
}));

const Label = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
}));

const Value = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(26),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.4px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.1,
}));

const Sub = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  marginTop: pxToRem(4),
}));

function OpenPrsHero({ prsByRepo }: Props) {
  const { t } = useTranslation();
  let open = 0;
  let draft = 0;
  for (const prs of Object.values(prsByRepo)) {
    for (const pr of prs) {
      if (pr.state !== PrState.OPEN) continue;
      open += 1;
      if (pr.draft) draft += 1;
    }
  }
  const review = Math.max(0, open - draft);
  return (
    <Root>
      <Label>{t("activity.hero.open_prs")}</Label>
      <Value>{open}</Value>
      <Sub>{t("activity.hero.open_prs_sub", { review, draft })}</Sub>
    </Root>
  );
}

export default OpenPrsHero;
