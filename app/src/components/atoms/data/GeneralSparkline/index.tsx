import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

interface Props {
  data: readonly number[];
  active?: boolean;
  width?: number;
  height?: number;
}

/**
 * Compact bar sparkline used in the Repos table row. Each value renders as a
 * thin vertical bar. Active (dirty) rows use the accent (primary) colour;
 * inactive rows render in the muted info-light grey. Zero-value buckets
 * collapse to a 2px flat line, mirroring the src-old `.spark .zero` rule.
 */
function GeneralSparkline({ data, active = false, width = 88, height = 18 }: Props) {
  const peak = Math.max(1, ...data);
  return (
    <Bars sx={{ width, height }} data-active={active ? "true" : undefined}>
      {data.map((v, i) => (
        <Bar
          key={i}
          data-zero={v === 0 ? "true" : undefined}
          style={{
            height: v === 0 ? 2 : `${Math.max(8, (v / peak) * 100)}%`,
          }}
        />
      ))}
    </Bars>
  );
}

export default GeneralSparkline;

const Bars = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-end",
  gap: 2,
  "& > span": {
    backgroundColor: theme.palette.text.informationLight ?? theme.palette.text.secondary,
  },
  "& > span[data-zero='true']": {
    backgroundColor: theme.palette.border.default,
  },
  "&[data-active='true'] > span": {
    backgroundColor: theme.palette.primary.main,
  },
  "&[data-active='true'] > span[data-zero='true']": {
    backgroundColor: theme.palette.border.default,
  },
}));

const Bar = styled("span")({
  display: "block",
  flex: 1,
  minWidth: 0,
  borderRadius: 1,
  minHeight: 2,
});
