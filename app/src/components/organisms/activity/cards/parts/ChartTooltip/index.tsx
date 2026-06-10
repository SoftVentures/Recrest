import {
  TooltipBox,
  TooltipDot,
  TooltipLabel,
  TooltipRow,
  TooltipTitle,
  TooltipValue,
} from "@/components/organisms/activity/cards/parts/ChartTooltip/ChartTooltip.styles";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface ChartTooltipRow {
  /** Optional color swatch shown as a leading dot. */
  color?: string;
  /** Row label (series / repo name). */
  label: string;
  /** Pre-formatted value string. */
  value: string;
}

interface Props {
  /** Bold heading — typically the bucket's date. */
  title: string;
  rows: ChartTooltipRow[];
}

/** Shared compact tooltip for the activity time-series cards. One date heading
 *  plus a labelled value row per series, so Nivo never falls back to its raw
 *  "x: 13, y: 1" default. */
function ChartTooltip({ title, rows }: Props) {
  return (
    <TooltipBox data-testid={TEST_IDS.activity.chartTooltip}>
      <TooltipTitle>{title}</TooltipTitle>
      {rows.map((row, i) => (
        <TooltipRow key={`${row.label}-${i}`}>
          {row.color ? <TooltipDot color={row.color} /> : null}
          <TooltipLabel>{row.label}</TooltipLabel>
          <TooltipValue>{row.value}</TooltipValue>
        </TooltipRow>
      ))}
    </TooltipBox>
  );
}

export default ChartTooltip;
