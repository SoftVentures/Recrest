import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralSkeletonLoader, {
  SkeletonShape,
} from "@/components/atoms/loaders/GeneralSkeletonLoader";
import {
  PAGE_DUR_MD,
  PAGE_EASE,
  pgZoom,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { pxToRem, pxToRems } from "@/theme/scale";

export interface BranchesSkeletonProps {
  /** How many placeholder repo-groups to draw (matched to the repo count so
   *  the skeleton has the same rhythm as the content it replaces). */
  groups?: number;
  /** Rows per group. */
  rows?: number;
}

/**
 * First-load placeholder for the Branches tab — mirrors the `RepoGroup` card
 * chrome (header + branch rows) with shimmering skeletons so the page has shape
 * and motion from frame one instead of a blank gap. Re-entry skips this
 * entirely (the `branches` store cache renders the real groups immediately).
 */
export function BranchesSkeleton({ groups = 3, rows = 3 }: BranchesSkeletonProps) {
  return (
    <>
      {Array.from({ length: groups }).map((_, g) => (
        <Card key={g}>
          <Head>
            <GeneralSkeletonLoader shape={SkeletonShape.CIRCLE} width={22} height={22} />
            <GeneralSkeletonLoader shape={SkeletonShape.LINE} width={140} height={13} />
            <Spacer />
            <GeneralSkeletonLoader shape={SkeletonShape.LINE} width={64} height={11} />
          </Head>
          <List>
            {Array.from({ length: rows }).map((_, r) => (
              <Row key={r}>
                <GeneralSkeletonLoader shape={SkeletonShape.CIRCLE} width={14} height={14} />
                <GeneralSkeletonLoader
                  shape={SkeletonShape.LINE}
                  width={`${42 + ((g + r) % 4) * 12}%`}
                  height={12}
                />
                <Spacer />
                <GeneralSkeletonLoader shape={SkeletonShape.LINE} width={48} height={11} />
              </Row>
            ))}
          </List>
        </Card>
      ))}
    </>
  );
}

export default BranchesSkeleton;

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
})) as typeof Box;

const Head = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  padding: pxToRems(11, 16),
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  padding: pxToRems(12, 16),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
})) as typeof Box;

const Spacer = styled(Box)({ flex: 1 }) as typeof Box;
