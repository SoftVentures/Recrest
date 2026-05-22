import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

interface Props {
  streak: number;
  longest: number;
}

const Root = styled(Box, { shouldForwardProp: (p) => p !== "hot" })<{ hot?: boolean }>(
  ({ theme, hot }) => ({
    backgroundColor: hot
      ? `color-mix(in srgb, ${theme.palette.primary.main} 8%, ${theme.palette.surface.interface.base})`
      : theme.palette.surface.interface.base,
    border: `1px solid ${
      hot
        ? `color-mix(in srgb, ${theme.palette.primary.main} 35%, ${theme.palette.divider})`
        : theme.palette.divider
    }`,
    borderRadius: 8,
    padding: "12px 14px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    height: "100%",
  }),
);

const Label = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
}));

const Value = styled("div", { shouldForwardProp: (p) => p !== "hot" })<{ hot?: boolean }>(
  ({ theme, hot }) => ({
    fontSize: 26,
    fontWeight: 700,
    color: hot ? theme.palette.primary.main : theme.palette.text.primary,
    letterSpacing: "-0.4px",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.1,
    display: "inline-flex",
    alignItems: "baseline",
    gap: 6,
  }),
);

const Fire = styled("span")({ fontSize: 18 });

const Delta = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
}));

function StreakCard({ streak, longest }: Props) {
  const { t } = useTranslation();
  const onFire = streak >= 3;
  const label =
    streak === 1
      ? t("activity.kpi.streak_days_one", { count: streak, defaultValue: `${streak} day` })
      : t("activity.kpi.streak_days_other", { count: streak, defaultValue: `${streak} days` });
  const bestLabel =
    longest === 1
      ? t("activity.kpi.streak_days_one", { count: longest, defaultValue: `${longest} day` })
      : t("activity.kpi.streak_days_other", { count: longest, defaultValue: `${longest} days` });
  return (
    <Root hot={onFire}>
      <Label>{t("activity.kpi.streak", { defaultValue: "Current streak" })}</Label>
      <Value hot={onFire}>
        {streak}
        {onFire && <Fire aria-hidden>🔥</Fire>}
      </Value>
      <Delta>
        {label}
        {longest > streak ? ` · best ${bestLabel}` : ""}
      </Delta>
    </Root>
  );
}

export default StreakCard;
