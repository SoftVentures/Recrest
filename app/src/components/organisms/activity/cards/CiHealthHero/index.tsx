import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

interface Props {
  summaries: readonly CheckRunSummary[];
}

interface Segment {
  key: "passed" | "failed" | "other";
  value: number;
  color: string;
}

const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "12px 14px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  height: "100%",
}));

const Label = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
}));

const Ring = styled(Box)({
  position: "relative",
  width: 66,
  height: 66,
  flexShrink: 0,
});

const RingSvg = styled("svg")({
  width: 66,
  height: 66,
  transform: "rotate(-90deg)",
});

const RingTrack = styled("circle")(({ theme }) => ({
  fill: "none",
  stroke: theme.palette.surface.interface.backElevation,
  strokeWidth: 6,
}));

const RingFill = styled("circle")({
  fill: "none",
  strokeWidth: 6,
  strokeLinecap: "butt",
});

const RingLabel = styled(Box)({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  lineHeight: 1,
  pointerEvents: "none",
});

const RingValue = styled("div")({
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.2px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
});

const RingSub = styled("div")(({ theme }) => ({
  fontSize: 9,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}));

const HeadRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

const Legend = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 10px",
  marginTop: 2,
});

const LegendItem = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10.5,
  color: theme.palette.text.information,
}));

const LegendDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: color,
}));

function CiHealthHero({ summaries }: Props) {
  const { t } = useTranslation();
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
      ? "var(--mui-palette-success-main, #16a34a)"
      : pct >= 0.8
        ? "var(--mui-palette-warning-main, #d97706)"
        : "var(--mui-palette-error-main, #dc2626)";

  // Donut geometry. Outer SVG viewbox is 66×66 so radius 27 gives a comfortable
  // 3px stroke gap inside the box without clipping the segment caps.
  const radius = 27;
  const circumference = 2 * Math.PI * radius;

  const segments: Segment[] = [
    { key: "passed", value: passed, color: "var(--mui-palette-success-main, #16a34a)" },
    { key: "failed", value: failing, color: "var(--mui-palette-error-main, #dc2626)" },
    { key: "other", value: other, color: "var(--mui-palette-warning-main, #d97706)" },
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
      <Label>{t("activity.hero.ci_health", { defaultValue: "CI health" })}</Label>
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
            <RingValue sx={{ color: headlineColor }}>
              {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
            </RingValue>
            <RingSub>
              {total === 0
                ? t("activity.hero.ci_none", { defaultValue: "no runs" })
                : `${passed}/${total}`}
            </RingSub>
          </RingLabel>
        </Ring>
        {total > 0 && (
          <Legend>
            <LegendItem>
              <LegendDot color="var(--mui-palette-success-main, #16a34a)" />
              {t("activity.hero.ci_legend_passed", {
                count: passed,
                defaultValue: `${passed} passed`,
              })}
            </LegendItem>
            <LegendItem>
              <LegendDot color="var(--mui-palette-error-main, #dc2626)" />
              {t("activity.hero.ci_legend_failed", {
                count: failing,
                defaultValue: `${failing} failed`,
              })}
            </LegendItem>
            {other > 0 && (
              <LegendItem>
                <LegendDot color="var(--mui-palette-warning-main, #d97706)" />
                {t("activity.hero.ci_legend_other", {
                  count: other,
                  defaultValue: `${other} other`,
                })}
              </LegendItem>
            )}
          </Legend>
        )}
      </HeadRow>
    </Root>
  );
}

export default CiHealthHero;
