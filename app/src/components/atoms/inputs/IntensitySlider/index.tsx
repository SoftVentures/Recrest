import { type ReactElement } from "react";

import { Box, Slider, type SliderProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";

/**
 * A 0..max integer slider with a tooltip that shows the current value while
 * dragging or hovering, AND a permanent value badge on the right so the
 * current percentage is always visible without having to hover. The tooltip
 * is rendered through {@link GeneralTooltip} so it picks up the app's
 * tooltip styling (theme-bound surface, border, shadow) instead of MUI's
 * default dark valueLabel block.
 *
 * The visual styling is intentionally minimal — callers are expected to
 * place this inside a settings row that already provides spacing + label.
 *
 * No default `data-testid` is set; pass `dataTestId` only when a test needs
 * to target the underlying slider element.
 */
export interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  dataTestId?: string;
  formatValue?: (value: number) => string;
}

const Container = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 16,
  paddingLeft: 24,
});

const StyledSlider = styled(Slider)({
  width: 200,
});

const ValueBadge = styled(Box)(({ theme }) => ({
  minWidth: 36,
  textAlign: "right",
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
})) as typeof Box;

interface ValueLabelProps {
  children: ReactElement;
  open: boolean;
  value: number;
}

function makeValueLabel(formatValue: (n: number) => string) {
  return function GeneralTooltipValueLabel(props: ValueLabelProps) {
    const { children, open, value } = props;
    // GeneralTooltip wraps the slider thumb directly so the tooltip
    // anchors at the right viewport position. MUI's Slider passes the
    // thumb in as `children` already carrying the className/positioning
    // it needs — we forward it untouched.
    return (
      <GeneralTooltip open={open} placement="top" arrow title={formatValue(value)}>
        {children}
      </GeneralTooltip>
    );
  };
}

function defaultFormat(value: number): string {
  return String(value);
}

export function IntensitySlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  ariaLabel,
  dataTestId,
  formatValue = defaultFormat,
}: IntensitySliderProps) {
  const props: SliderProps = {
    min,
    max,
    step,
    value,
    "aria-label": ariaLabel,
    valueLabelDisplay: "auto",
    slots: { valueLabel: makeValueLabel(formatValue) },
    onChange: (_event, next) => {
      const n = Array.isArray(next) ? next[0] : next;
      if (typeof n === "number") onChange(n);
    },
  };
  if (dataTestId) (props as Record<string, unknown>)["data-testid"] = dataTestId;
  return (
    <Container>
      <StyledSlider {...props} />
      <ValueBadge component="span" aria-hidden>
        {formatValue(value)}
      </ValueBadge>
    </Container>
  );
}

export default IntensitySlider;
