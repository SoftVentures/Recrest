import { type ReactNode } from "react";

import { Box, Skeleton } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Shared chrome for the Activity-style cards (Heatmap, LanguageDonut, etc.)
 * — same border + padding rhythm as `a-act-card` in the old CSS world.
 * Provides title + optional sub + optional right slot, and a `loading` mode
 * that swaps the body for one of a handful of preset shimmer shapes so the
 * layout doesn't jump when real data lands.
 */

export interface ActivityCardShellProps {
  title: string;
  sub?: string | null;
  className?: string;
  right?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  /** Shimmer preset used when `loading` is set. */
  skeleton?: "donut" | "heatmap" | "rows";
}

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "14px 16px",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  minWidth: 0,
  // Slot this organism into any parent grid; callers stretch via grid-column.
  height: "100%",
}));

const Head = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

const TitleCol = styled(Box)({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

const Title = styled("h3")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
}));

const Sub = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

function ActivityCardShell({
  title,
  sub,
  className,
  right,
  children,
  loading,
  skeleton = "rows",
}: ActivityCardShellProps) {
  return (
    <Root className={className}>
      <Head>
        <TitleCol>
          <Title>{title}</Title>
          {sub && <Sub>{sub}</Sub>}
        </TitleCol>
        {right}
      </Head>
      {loading ? <CardSkeleton shape={skeleton} /> : children}
    </Root>
  );
}

export default ActivityCardShell;

/* ───────── Skeletons ─────────
 * Built on MUI's `Skeleton` so the shimmer wave + palette stays consistent
 * with every other skeleton in the app (and honours `prefers-reduced-motion`
 * for free). */

const DonutSkelWrap = styled(Box)({
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

const HeatmapSkelWrap = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(24, 1fr)",
  gridTemplateRows: "repeat(7, 1fr)",
  gap: 3,
  padding: "8px 0",
});

const RowsSkelWrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "8px 0",
});

function CardSkeleton({ shape }: { shape: NonNullable<ActivityCardShellProps["skeleton"]> }) {
  if (shape === "donut") {
    return (
      <DonutSkelWrap role="status" aria-busy>
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
      </DonutSkelWrap>
    );
  }
  if (shape === "heatmap") {
    return (
      <HeatmapSkelWrap role="status" aria-busy>
        {Array.from({ length: 7 * 24 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            animation="wave"
            height={10}
            sx={{ width: "100%", borderRadius: 1 }}
          />
        ))}
      </HeatmapSkelWrap>
    );
  }
  return (
    <RowsSkelWrap role="status" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          animation="wave"
          height={12}
          sx={{ width: "100%", borderRadius: 1 }}
        />
      ))}
    </RowsSkelWrap>
  );
}
