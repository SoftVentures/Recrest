import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralSkeletonLoader, {
  SkeletonShape,
} from "@/components/atoms/loaders/GeneralSkeletonLoader";

interface SkeletonBoxProps {
  w?: number | string;
  h?: number;
  radius?: number;
}

function SkeletonBox({ w = "100%", h = 12, radius = 4 }: SkeletonBoxProps) {
  return (
    <GeneralSkeletonLoader
      shape={SkeletonShape.BLOCK}
      width={w}
      height={h}
      sx={{ borderRadius: `${radius}px` }}
    />
  );
}

const KpiCardShell = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
}));

export function KpiSkeleton() {
  return (
    <KpiCardShell aria-hidden>
      <SkeletonBox w={96} h={10} />
      <SkeletonBox w={64} h={22} />
      <SkeletonBox w={80} h={10} />
    </KpiCardShell>
  );
}

const ChartShell = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(14, 1fr)",
  gap: 6,
  height: 96,
  alignItems: "end",
  padding: "4px 0 0",
});

const BarColumnShell = styled(Box)({
  height: "100%",
  display: "flex",
  alignItems: "end",
});

export function ActivityBarsSkeleton() {
  return (
    <ChartShell aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <BarColumnShell key={i}>
          <SkeletonBox w="100%" h={Math.round(20 + ((i * 37) % 70))} radius={4} />
        </BarColumnShell>
      ))}
    </ChartShell>
  );
}

const CardShellBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
}));

const CardHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

const RowsCol = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingTop: 2,
});

const Row = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export interface CardBlockSkeletonProps {
  rows?: number;
  /** Render the title bar at the top. Defaults to true. */
  title?: boolean;
}

export function CardBlockSkeleton({ rows = 3, title = true }: CardBlockSkeletonProps) {
  return (
    <CardShellBox aria-hidden>
      {title && (
        <CardHead>
          <SkeletonBox w={128} h={13} />
          <SkeletonBox w={80} h={10} />
        </CardHead>
      )}
      <RowsCol>
        {Array.from({ length: rows }).map((_, i) => (
          <Row key={i}>
            <SkeletonBox w={24} h={24} radius={5} />
            <SkeletonBox w="100%" h={11} />
            <SkeletonBox w={40} h={11} />
          </Row>
        ))}
      </RowsCol>
    </CardShellBox>
  );
}

const CommitRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 8px",
});

const CommitTextCol = styled(Box)({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
});

export interface CommitListSkeletonProps {
  rows?: number;
}

export function CommitListSkeleton({ rows = 4 }: CommitListSkeletonProps) {
  return (
    <Box aria-hidden sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <CommitRow key={i}>
          <SkeletonBox w={24} h={24} radius={5} />
          <CommitTextCol>
            <SkeletonBox w="60%" h={11} />
            <SkeletonBox w="40%" h={9} />
          </CommitTextCol>
        </CommitRow>
      ))}
    </Box>
  );
}
