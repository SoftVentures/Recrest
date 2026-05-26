import { type ReactNode } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralSkeletonLoader, {
  SkeletonShape,
} from "@/components/atoms/loaders/GeneralSkeletonLoader";

export type GeneralCardSkeleton = "bars" | "donut" | "rows" | "line" | "heatmap" | "radial";

export interface GeneralCardProps {
  /** Card heading. Omit to render just the surface + body (no head row). */
  title?: string;
  sub?: string | null;
  /** Slot rendered at the top-right of the title row (filter chip, legend, …). */
  right?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  skeleton?: GeneralCardSkeleton;
  /** Forwarded as `data-testid` on the outer card. */
  testId?: string;
  /** Outer wrapper class — wrap in a `styled(GeneralCard)` for layout overrides (e.g. `gridColumn`). */
  className?: string;
  /** Overrides the default `14px 16px 12px` padding when callers need a tighter or roomier surface. */
  padding?: string | number;
  /** Disable the default `height: 100%` so the card hugs its content instead of stretching. */
  flushHeight?: boolean;
}

interface RootProps {
  padding: string | number;
  flushHeight: boolean;
}

const Root = styled(Box, {
  shouldForwardProp: (p) => p !== "padding" && p !== "flushHeight",
})<RootProps>(({ theme, padding, flushHeight }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 0,
  height: flushHeight ? undefined : "100%",
}));

const Head = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
});

const HeadLeft = styled(Box)({
  minWidth: 0,
});

const Title = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.1px",
})) as typeof Typography;

const Sub = styled(Box)(({ theme }) => ({
  marginTop: 2,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const BarsSkel = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  height: 180,
});

const BarsSkelCol = styled(GeneralSkeletonLoader, {
  shouldForwardProp: (p) => p !== "h",
})<{ h: number }>(({ h }) => ({
  flex: 1,
  height: `${h}%`,
  borderRadius: "8px 8px 0 0",
  transform: "none",
}));

const RowsSkel = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "6px 0",
});

const DonutSkel = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: 16,
  padding: "8px 0",
});

const DonutSkelLegend = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const HeatmapSkel = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(24, 1fr)",
  gridTemplateRows: "repeat(7, 1fr)",
  gap: 3,
  padding: "8px 0",
});

const LegendSkel = styled(GeneralSkeletonLoader)({
  borderRadius: 8,
});

const HeatCellSkel = styled(GeneralSkeletonLoader)({
  width: "100%",
  borderRadius: 8,
});

const LineSkel = styled(GeneralSkeletonLoader)({
  width: "100%",
  borderRadius: 8,
});

const RadialSkel = styled(GeneralSkeletonLoader)({
  margin: "0 auto",
});

const RowSkel = styled(GeneralSkeletonLoader)({
  width: "100%",
  borderRadius: 8,
});

function CardSkeleton({ shape }: { shape: GeneralCardSkeleton }) {
  if (shape === "bars") {
    const heights = [35, 70, 55, 20, 65, 45, 80, 30, 60, 50, 75, 40, 55, 25];
    return (
      <BarsSkel role="status" aria-busy>
        {heights.map((h, i) => (
          <BarsSkelCol key={i} h={h} shape={SkeletonShape.BLOCK} />
        ))}
      </BarsSkel>
    );
  }
  if (shape === "donut") {
    return (
      <DonutSkel role="status" aria-busy>
        <GeneralSkeletonLoader shape={SkeletonShape.CIRCLE} width={120} height={120} />
        <DonutSkelLegend>
          {Array.from({ length: 6 }).map((_, i) => (
            <LegendSkel key={i} shape={SkeletonShape.BLOCK} width={140} height={11} />
          ))}
        </DonutSkelLegend>
      </DonutSkel>
    );
  }
  if (shape === "heatmap") {
    return (
      <HeatmapSkel role="status" aria-busy>
        {Array.from({ length: 7 * 24 }).map((_, i) => (
          <HeatCellSkel key={i} shape={SkeletonShape.BLOCK} height={10} />
        ))}
      </HeatmapSkel>
    );
  }
  if (shape === "line") {
    return <LineSkel role="status" aria-busy shape={SkeletonShape.BLOCK} height={80} />;
  }
  if (shape === "radial") {
    return (
      <RadialSkel role="status" aria-busy shape={SkeletonShape.CIRCLE} width={130} height={130} />
    );
  }
  return (
    <RowsSkel role="status" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <RowSkel key={i} shape={SkeletonShape.BLOCK} height={12} />
      ))}
    </RowsSkel>
  );
}

function GeneralCard({
  title,
  sub,
  right,
  children,
  loading,
  skeleton = "rows",
  testId,
  className,
  padding = "14px 16px 12px",
  flushHeight = false,
}: GeneralCardProps) {
  const showHead = title !== undefined || right !== undefined;
  return (
    <Root data-testid={testId} className={className} padding={padding} flushHeight={flushHeight}>
      {showHead && (
        <Head>
          <HeadLeft>
            {title !== undefined && (
              <Title variant="subtitle2" component="h3">
                {title}
              </Title>
            )}
            {sub && <Sub>{sub}</Sub>}
          </HeadLeft>
          {right}
        </Head>
      )}
      {loading ? <CardSkeleton shape={skeleton} /> : children}
    </Root>
  );
}

export default GeneralCard;
