import { useTranslation } from "react-i18next";

import { useTheme } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

import { ResponsivePie } from "@nivo/pie";

import {
  HeadRow,
  Label,
  Legend,
  LegendDot,
  LegendItem,
  Ring,
  RingLabel,
  RingValue,
  Root,
} from "@/components/organisms/activity/cards/CiHealthHero/CiHealthHero.styles";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { GAUGE_FAIL, GAUGE_OTHER, GAUGE_PASS } from "@/lib/charts/palette";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";

interface Props {
  summaries: readonly CheckRunSummary[];
}

function CiHealthHero({ summaries }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
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
  // src-old palette: green ≥95%, amber 80-95%, red <80%. Resolve via toneText
  // so the centred number stays readable on the dark theme (the raw `.main`
  // green/red is too dark to read inside the ring).
  const headlineColor = toneText(
    theme,
    pct >= 0.95 ? StatusTone.SUCCESS : pct >= 0.8 ? StatusTone.WARNING : StatusTone.ERROR,
  );

  const gaugeData =
    total === 0
      ? [{ id: "empty", value: 1, color: theme.palette.surface.interface.backElevation }]
      : [
          { id: "passed", value: passed, color: GAUGE_PASS },
          { id: "failed", value: failing, color: GAUGE_FAIL },
          { id: "other", value: other, color: GAUGE_OTHER },
        ].filter((s) => s.value > 0);

  return (
    <Root>
      <Label>{t("activity.hero.ci_health")}</Label>
      <HeadRow>
        <Ring>
          <ResponsivePie
            data={gaugeData}
            theme={nivoTheme}
            colors={{ datum: "data.color" }}
            innerRadius={0.8}
            padAngle={2}
            cornerRadius={2}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            isInteractive={false}
          />
          <RingLabel>
            <RingValue style={{ color: headlineColor }}>
              {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
            </RingValue>
          </RingLabel>
        </Ring>
        {total > 0 && (
          <Legend>
            <LegendItem component="span" variant="caption">
              <LegendDot color={GAUGE_PASS} />
              {t("activity.hero.ci_legend_passed", { count: passed })}
            </LegendItem>
            <LegendItem component="span" variant="caption">
              <LegendDot color={GAUGE_FAIL} />
              {t("activity.hero.ci_legend_failed", { count: failing })}
            </LegendItem>
            {other > 0 && (
              <LegendItem component="span" variant="caption">
                <LegendDot color={GAUGE_OTHER} />
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
