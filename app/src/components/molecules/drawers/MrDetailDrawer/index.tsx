import { type Ref } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { PullRequest } from "@recrest/shared";

import GeneralDrawer, {
  type GeneralDrawerSize,
} from "@/components/molecules/drawers/GeneralDrawer";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MrDetailPanel } from "@/pages/app/MergeRequests/components/MrDetailPanel";

const DrawerBody = styled(Box)({
  height: "100%",
}) as typeof Box;

export interface MrDetailDrawerProps {
  pr: PullRequest | null;
  repoId: string;
  repoName?: string;
  size?: GeneralDrawerSize;
  /** Optional ref forwarded to the drawer body — enables swipe-to-close
   *  handlers (`useDrawerSwipe`) on the same node MUI mounts the content into. */
  bodyRef?: Ref<HTMLDivElement>;
  /** Pass-through `data-testid` for the drawer body so E2E specs can target it. */
  bodyTestId?: string;
  /** Pass-through `data-testid` for the drawer root (paper). */
  "data-testid"?: string;
  onClose: () => void;
}

/**
 * The canonical "open this PR in a side drawer" widget. Wraps `GeneralDrawer`
 * with the `MrDetailPanel` body and the testid plumbing so callers don't have
 * to re-stitch the drawer shell each time. Used on both the MR list page and
 * the per-repo detail page.
 */
function MrDetailDrawer({
  pr,
  repoId,
  repoName,
  size = "md",
  bodyRef,
  bodyTestId = TEST_IDS.mr.drawer,
  "data-testid": testId,
  onClose,
}: MrDetailDrawerProps) {
  return (
    <GeneralDrawer open={!!pr} onClose={onClose} size={size} data-testid={testId}>
      <DrawerBody ref={bodyRef} data-testid={bodyTestId}>
        {pr && <MrDetailPanel pr={pr} repoId={repoId} repoName={repoName} onClose={onClose} />}
      </DrawerBody>
    </GeneralDrawer>
  );
}

export default MrDetailDrawer;
