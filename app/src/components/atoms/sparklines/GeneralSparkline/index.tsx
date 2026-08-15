import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { pxToRem } from "@/theme/scale";

export interface GeneralSparklineProps {
  data: readonly number[];
  width?: number;
  height?: number;
  /** Bar colour. Defaults to `theme.palette.text.informationLight`. */
  accentColor?: string;
  /** Colour for zero-value buckets. Defaults to `theme.palette.border.default`. */
  zeroColor?: string;
  /** Gap between bars in pixels. Default `2`. */
  gap?: number;
  /** Flat-line height in pixels for zero-valued buckets. Default `2`. */
  minBarHeight?: number;
  testId?: string;
}

const Bars = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
}) as typeof Box;

const Bar = styled(Box, {
  shouldForwardProp: (p) => p !== "accent" && p !== "zero" && p !== "isZero",
})<{ accent?: string; zero?: string; isZero: boolean }>(({ theme, accent, zero, isZero }) => ({
  flex: 1,
  minWidth: 0,
  borderRadius: 1,
  minHeight: 2,
  backgroundColor: isZero
    ? (zero ?? theme.palette.border.default)
    : (accent ?? theme.palette.text.informationLight ?? theme.palette.text.secondary),
}));

function GeneralSparkline({
  data,
  width = 88,
  height = 18,
  accentColor,
  zeroColor,
  gap = 2,
  minBarHeight = 2,
  testId,
}: GeneralSparklineProps) {
  const peak = Math.max(1, ...data);
  return (
    <Bars
      style={{ width: pxToRem(width), height: pxToRem(height), gap: pxToRem(gap) }}
      data-testid={testId}
    >
      {data.map((v, i) => {
        const isZero = v === 0;
        return (
          <Bar
            key={i}
            accent={accentColor}
            zero={zeroColor}
            isZero={isZero}
            style={{
              height: isZero ? pxToRem(minBarHeight) : `${Math.max(8, (v / peak) * 100)}%`,
            }}
          />
        );
      })}
    </Bars>
  );
}

export default GeneralSparkline;
