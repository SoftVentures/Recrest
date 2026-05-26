import { useTranslation } from "react-i18next";

import { useTheme } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

import {
  HeadRow,
  Label,
  Legend,
  LegendDot,
  LegendItem,
  Ring,
  RingFill,
  RingLabel,
  RingSub,
  RingSvg,
  RingTrack,
  RingValue,
  Root,
} from "@/components/organisms/activity/cards/CiHealthHero/CiHealthHero.styles";

interface Props {
  summaries: readonly CheckRunSummary[];
}

interface Segment {
  key: "passed" | "failed" | "other";
  value: number;
  color: string;
}

function CiHealthHero({ summaries }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  let passed = 0;
  let total = 0;
  let failing = 0;
  for (const s of summaries) {
    passed += s.passed;
    total += s.total;
    failing += s.failed;
  }
  const other = Math.max(0, total - passed - failing);
  const pct = total === 0 ? 1 : passed / total;
  // src-old palette: green ≥95%, amber 80-95%, red <80%.
  const headlineColor =
    pct >= 0.95
      ? theme.palette.success.main
      : pct >= 0.8
        ? theme.palette.warning.main
        : theme.palette.error.main;

  // Donut geometry: outer SVG viewbox is 66×66 so radius 27 gives a comfortable
  // 3px stroke gap inside the box without clipping the segment caps.
  const radius = 27;
  const circumference = 2 * Math.PI * radius;

  const segments: Segment[] = [
    { key: "passed", value: passed, color: theme.palette.success.main },
    { key: "failed", value: failing, color: theme.palette.error.main },
    { key: "other", value: other, color: theme.palette.warning.main },
  ];
  const segTotal = segments.reduce((a, s) => a + s.value, 0);

  let cursor = 0;
  const renderedSegments =
    segTotal === 0
      ? []
      : segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = (s.value / segTotal) * circumference;
            const offset = -cursor;
            cursor += length;
            return { ...s, dash: `${length} ${circumference - length}`, offset };
          });

  return (
    <Root>
      <Label>{t("activity.hero.ci_health")}</Label>
      <HeadRow>
        <Ring>
          <RingSvg viewBox="0 0 66 66">
            <RingTrack cx="33" cy="33" r={radius} />
            {renderedSegments.length === 0 ? (
              <circle
                cx="33"
                cy="33"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={5}
                opacity={0.3}
              />
            ) : (
              renderedSegments.map((s) => (
                <RingFill
                  key={s.key}
                  cx="33"
                  cy="33"
                  r={radius}
                  style={{
                    stroke: s.color,
                    strokeDasharray: s.dash,
                    strokeDashoffset: s.offset,
                  }}
                />
              ))
            )}
          </RingSvg>
          <RingLabel>
            <RingValue style={{ color: headlineColor }}>
              {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
            </RingValue>
            <RingSub>{total === 0 ? t("activity.hero.ci_none") : `${passed}/${total}`}</RingSub>
          </RingLabel>
        </Ring>
        {total > 0 && (
          <Legend>
            <LegendItem component="span" variant="caption">
              <LegendDot color={theme.palette.success.main} />
              {t("activity.hero.ci_legend_passed", { count: passed })}
            </LegendItem>
            <LegendItem component="span" variant="caption">
              <LegendDot color={theme.palette.error.main} />
              {t("activity.hero.ci_legend_failed", { count: failing })}
            </LegendItem>
            {other > 0 && (
              <LegendItem component="span" variant="caption">
                <LegendDot color={theme.palette.warning.main} />
                {t("activity.hero.ci_legend_other", { count: other })}
              </LegendItem>
            )}
          </Legend>
        )}
      </HeadRow>
    </Root>
  );
}

export default CiHealthHero;
