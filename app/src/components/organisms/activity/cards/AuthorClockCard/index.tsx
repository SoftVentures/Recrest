import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ResponsiveBar } from "@nivo/bar";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { CHART_PALETTE, fade } from "@/lib/charts/palette";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  hours: number[];
  loading?: boolean;
}

const AXIS_HOURS = ["0", "6", "12", "18"];
const INDIGO = CHART_PALETTE[0];

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 6,
});

const Chart = styled(Box)({
  height: 150,
});

// TODO(next-pass): unify with parts/ChartTooltip
const Tooltip = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));

const Foot = styled(Box)(({ theme }) => ({
  textAlign: "center",
  fontSize: 11,
  color: theme.palette.text.information,
  "& > strong": {
    display: "block",
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    marginBottom: 1,
  },
}));

/** 24-column histogram — one bar per hour, height scaled by commit count. */
function AuthorClockCard({ hours, loading }: Props) {
  const { t } = useTranslation();
  const nivoTheme = useNivoTheme();

  const data = hours.map((count, h) => ({ hour: String(h), count }));

  const peak = Math.max(1, ...hours);
  const total = hours.reduce((a, b) => a + b, 0);
  const peakHour = hours.indexOf(peak);
  const peakLabel =
    total > 0
      ? `${String(peakHour).padStart(2, "0")}:00 · ${Math.round((peak / total) * 100)}%`
      : "—";

  return (
    <GeneralCard
      title={t("activity.cards.clock_title")}
      sub={t("activity.cards.clock_sub")}
      loading={loading}
      skeleton="radial"
      testId={TEST_IDS.activity.cards.authorClock}
    >
      <Wrap>
        <Chart>
          <ResponsiveBar
            data={data}
            keys={["count"]}
            indexBy="hour"
            theme={nivoTheme}
            colors={(bar) => fade(INDIGO, 0.25 + 0.75 * (Number(bar.data.count) / peak))}
            margin={{ top: 4, right: 4, bottom: 18, left: 4 }}
            padding={0.25}
            borderRadius={2}
            enableLabel={false}
            axisLeft={null}
            axisBottom={{
              format: (v) => (AXIS_HOURS.includes(String(v)) ? String(v) : ""),
            }}
            enableGridY={false}
            tooltip={({ data }) => {
              const h = Number(data.hour);
              return (
                <Tooltip>
                  {t("activity.cards.clock_tooltip", {
                    range: `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`,
                    commits: t("activity.cards.commits_count", {
                      count: Number(data.count),
                    }),
                  })}
                </Tooltip>
              );
            }}
          />
        </Chart>
        <Foot>
          <Box component="strong">{peakLabel}</Box>
          <Box component="span">{t("activity.cards.commits_count", { count: total })}</Box>
        </Foot>
      </Wrap>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(AuthorClockCard);
