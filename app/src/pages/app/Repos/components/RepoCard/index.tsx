import { type KeyboardEvent, type MouseEvent } from "react";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { GitBranch } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import AheadBehind from "@/components/atoms/git/AheadBehind";
import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { RepoActions } from "@/pages/app/Repos/components/RepoActions";
import {
  Actions,
  Body,
  BranchChip,
  BranchRow,
  BranchText,
  Card,
  CardTop,
  Diff,
  FilesMeta,
  Footer,
  Name,
  Path,
  StatusDot,
  StatusGroup,
  StatusText,
} from "@/pages/app/Repos/components/RepoCard/RepoCard.styles";

export interface RepoCardProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onClick?: (repo: EnrichedRepo) => void;
}

export function RepoCard({ repo, selected, onClick }: RepoCardProps) {
  const theme = useTheme();
  const dirty = !!repo.status.dirty;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <Card
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      data-testid={TEST_IDS.repos.card}
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onClick?.(repo)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
          e.preventDefault();
          onClick?.(repo);
        }
      }}
    >
      <CardTop>
        <RepoAvatar repo={repo} size={36} radius={8} />
        <Actions onClick={stop}>
          <RepoActions repo={repo} iconSize={IconButtonSize.SM} />
        </Actions>
      </CardTop>

      <Body>
        <Name data-testid={TEST_IDS.repos.cardName}>{repo.name}</Name>
        <Path>{repo.path}</Path>
        <BranchRow>
          <BranchChip>
            <GitBranch size={11} />
            <BranchText component="span">{repo.status.branch ?? "—"}</BranchText>
          </BranchChip>
          <AheadBehind ahead={repo.status.ahead} behind={repo.status.behind} variant="compact" />
        </BranchRow>
      </Body>

      <Footer>
        <StatusGroup>
          <StatusDot component="span" data-dirty={dirty ? "true" : undefined} />
          {dirty ? (
            <Diff component="span">
              <Box component="span" className="add">
                +{repo.added}
              </Box>
              <Box component="span" className="rem">
                −{repo.removed}
              </Box>
              <FilesMeta component="span" variant="caption">
                · {repo.filesChanged} files
              </FilesMeta>
            </Diff>
          ) : (
            <StatusText component="span" variant="caption">
              clean
            </StatusText>
          )}
        </StatusGroup>
        <GeneralSparkline
          data={repo.activity}
          accentColor={dirty ? theme.palette.primary.main : undefined}
          width={88}
          height={18}
        />
      </Footer>
    </Card>
  );
}
