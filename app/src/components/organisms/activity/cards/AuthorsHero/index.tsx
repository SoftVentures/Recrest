import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ArrowDown, ArrowUp } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import type { WeekPair } from "@/lib/activityStats";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface Props {
  authors: WeekPair;
  /** Top contributors rendered as overlapping avatars. */
  topAuthors: { name: string; email: string | null }[];
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

const Foot = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(8),
  marginTop: pxToRem(6),
});

const AvStack = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  "& > *": {
    marginLeft: pxToRem(-6),
    border: `2px solid ${theme.palette.surface.interface.base}`,
    borderRadius: "50%",
  },
  "& > *:first-of-type": {
    marginLeft: 0,
  },
}));

const Delta = styled(Box, { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "up" | "down" | "flat";
}>(({ theme, tone }) => ({
  fontSize: fontPxToRem(11),
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontVariantNumeric: "tabular-nums",
  marginLeft: "auto",
  color:
    tone === "up"
      ? theme.palette.success.main
      : tone === "down"
        ? theme.palette.warning.main
        : theme.palette.text.information,
}));

function AuthorsHero({ authors, topAuthors }: Props) {
  const { t } = useTranslation();
  const dir: "up" | "down" | "flat" =
    authors.delta === 0 ? "flat" : authors.delta > 0 ? "up" : "down";
  const deltaLabel =
    authors.delta === 0
      ? t("activity.kpi.delta_flat")
      : authors.delta > 0
        ? t("activity.kpi.delta_up", { delta: authors.delta })
        : t("activity.kpi.delta_down", { delta: authors.delta });
  return (
    <Root>
      <Label>{t("activity.kpi.authors_week")}</Label>
      <Value>{authors.current}</Value>
      <Foot>
        <AvStack aria-hidden>
          {topAuthors.slice(0, 3).map((a) => (
            <AuthorAvatar key={a.name} name={a.name} email={a.email ?? undefined} size={22} />
          ))}
        </AvStack>
        <Delta tone={dir}>
          {dir === "up" && <ArrowUp size={pxToRem(11)} aria-hidden />}
          {dir === "down" && <ArrowDown size={pxToRem(11)} aria-hidden />}
          <Box component="span">{deltaLabel}</Box>
        </Delta>
      </Foot>
    </Root>
  );
}

export default AuthorsHero;
