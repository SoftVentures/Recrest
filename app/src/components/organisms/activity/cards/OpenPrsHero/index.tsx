import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { PullRequest } from "@recrest/shared";

interface Props {
  prsByRepo: Record<string, readonly PullRequest[]>;
}

const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "12px 14px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  height: "100%",
}));

const Label = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
}));

const Value = styled("div")(({ theme }) => ({
  fontSize: 26,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.4px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.1,
}));

const Sub = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  marginTop: 4,
}));

function OpenPrsHero({ prsByRepo }: Props) {
  const { t } = useTranslation();
  let open = 0;
  let draft = 0;
  for (const prs of Object.values(prsByRepo)) {
    for (const pr of prs) {
      if (pr.state !== "open") continue;
      open += 1;
      if (pr.draft) draft += 1;
    }
  }
  const review = Math.max(0, open - draft);
  return (
    <Root>
      <Label>{t("activity.hero.open_prs", { defaultValue: "Open MRs" })}</Label>
      <Value>{open}</Value>
      <Sub>
        {t("activity.hero.open_prs_sub", {
          review,
          draft,
          defaultValue: `${review} in review · ${draft} draft`,
        })}
      </Sub>
    </Root>
  );
}

export default OpenPrsHero;
