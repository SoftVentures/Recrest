import { type ReactNode } from "react";

import { Box, Skeleton } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * `GeneralCard` is the shared chrome every dashboard tile renders on top of.
 *
 * Visuals match src-old `.a-act-card` / `.a-set-card`:
 * - `surface.interface.base` background, 1px divider border, 10px radius
 * - 14/16/12 padding (title row · body · bottom breathing room)
 * - Title row: `<h3>` (13/700, ink-0) with optional sub-text (11.5, ink-3)
 *   on the left; arbitrary slot on the right (for filter chips, deltas, …)
 *
 * `loading` swaps the body for a shimmer placeholder so the card chrome
 * doesn't pop in when data arrives. Five preset shapes mirror the legacy
 * skeletons (bars, donut, rows, line, heatmap, radial).
 */

export type GeneralCardSkeleton = "bars" | "donut" | "rows" | "line" | "heatmap" | "radial";

export interface GeneralCardProps {
  title: string;
  sub?: string | null;
  /** Slot rendered at the top-right of the title row (filter chip, legend, …). */
  right?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  skeleton?: GeneralCardSkeleton;
  /** Forwarded as `data-testid` on the outer card. */
  testId?: string;
  /** Optional extra `className` so callers can tag a specific tile (e.g. for
   *  layout overrides in narrow grid columns). Plain MUI `sx` is preferred —
   *  use this only when an existing global selector needs to attach. */
  className?: string;
}

const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 0,
  height: "100%",
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

const Title = styled("h3")(({ theme }) => ({
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.1px",
}));

const Sub = styled("div")(({ theme }) => ({
  marginTop: 2,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

function GeneralCard({
  title,
  sub,
  right,
  children,
  loading,
  skeleton = "rows",
  testId,
  className,
}: GeneralCardProps) {
  return (
    <Root data-testid={testId} className={className}>
      <Head>
        <HeadLeft>
          <Title>{title}</Title>
          {sub && <Sub>{sub}</Sub>}
        </HeadLeft>
        {right}
      </Head>
      {loading ? <CardSkeleton shape={skeleton} /> : children}
    </Root>
  );
}

export default GeneralCard;

/* ─── Skeleton placeholders ─── */
/* MUI Skeleton owns the shimmer animation + colour-mix from the theme. Each
 * shape below just composes one or more `<Skeleton>` instances at the right
 * dimensions. The custom keyframes shimmer that lived here previously is
 * gone — MUI's built-in wave/pulse handles it consistently with every other
 * skeleton in the app. */

const BarsSkel = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  height: 180,
});

const BarsSkelCol = styled(Skeleton, { shouldForwardProp: (p) => p !== "h" })<{ h: number }>(
  ({ h }) => ({
    flex: 1,
    height: `${h}%`,
    borderRadius: "8px 8px 0 0",
    transform: "none",
  }),
);

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

function CardSkeleton({ shape }: { shape: GeneralCardSkeleton }) {
  if (shape === "bars") {
    const heights = [35, 70, 55, 20, 65, 45, 80, 30, 60, 50, 75, 40, 55, 25];
    return (
      <BarsSkel role="status" aria-busy>
        {heights.map((h, i) => (
          <BarsSkelCol key={i} h={h} variant="rectangular" animation="wave" />
        ))}
      </BarsSkel>
    );
  }
  if (shape === "donut") {
    return (
      <DonutSkel role="status" aria-busy>
        <Skeleton variant="circular" animation="wave" width={120} height={120} />
        <DonutSkelLegend>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              animation="wave"
              width={140}
              height={11}
              sx={{ borderRadius: 1 }}
            />
          ))}
        </DonutSkelLegend>
      </DonutSkel>
    );
  }
  if (shape === "heatmap") {
    return (
      <HeatmapSkel role="status" aria-busy>
        {Array.from({ length: 7 * 24 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            animation="wave"
            height={10}
            sx={{ width: "100%", borderRadius: 1 }}
          />
        ))}
      </HeatmapSkel>
    );
  }
  if (shape === "line") {
    return (
      <Skeleton
        role="status"
        aria-busy
        variant="rectangular"
        animation="wave"
        height={80}
        sx={{ width: "100%", borderRadius: 1 }}
      />
    );
  }
  if (shape === "radial") {
    return (
      <Skeleton
        role="status"
        aria-busy
        variant="circular"
        animation="wave"
        width={130}
        height={130}
        sx={{ margin: "0 auto" }}
      />
    );
  }
  return (
    <RowsSkel role="status" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          animation="wave"
          height={12}
          sx={{ width: "100%", borderRadius: 1 }}
        />
      ))}
    </RowsSkel>
  );
}
