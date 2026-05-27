import { type KeyboardEvent, type MouseEvent } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { GitBranch, Pin } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralIconButton, {
  IconButtonSize,
  IconButtonTone,
  IconButtonVariant,
} from "@/components/atoms/buttons/GeneralIconButton";
import AheadBehind from "@/components/atoms/git/AheadBehind";
import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { RepoActions } from "@/pages/app/Repos/components/RepoActions";
import {
  Actions,
  ActivityCell,
  BranchCell,
  BranchChip,
  BranchText,
  Diff,
  FilesMeta,
  Name,
  NameCell,
  Path,
  PinSlot,
  Row,
  StatusCell,
  StatusText,
  TextCol,
} from "@/pages/app/Repos/components/RepoRow/RepoRow.styles";
import { togglePinnedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export interface RepoRowProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onClick?: (repo: EnrichedRepo) => void;
}

export function RepoRow({ repo, selected, onClick }: RepoRowProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const dirty = !!repo.status.dirty;
  const ahead = repo.status.ahead;
  const behind = repo.status.behind;

  const stop = (e: MouseEvent) => e.stopPropagation();

  const onInlinePin = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(togglePinnedRepo(repo.id));
  };

  return (
    <Row
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      data-testid={TEST_IDS.repos.row}
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
      <NameCell>
        <PinSlot data-pin-slot data-pinned={repo.pinned ? "true" : undefined}>
          <GeneralIconButton
            size={IconButtonSize.XS}
            variant={IconButtonVariant.GHOST}
            tone={repo.pinned ? IconButtonTone.PRIMARY : IconButtonTone.NEUTRAL}
            aria-label={repo.pinned ? tAria("repo.unpin") : tAria("repo.pin")}
            data-testid={TEST_IDS.repos.rowPinToggle}
            onClick={onInlinePin}
            icon={<Pin size={13} />}
          />
        </PinSlot>
        <RepoAvatar repo={repo} size={28} radius={6} />
        <TextCol>
          <Name data-testid={TEST_IDS.repos.rowName}>{repo.name}</Name>
          <Path>{repo.path}</Path>
        </TextCol>
      </NameCell>

      <BranchCell>
        {repo.status.branch && (
          <BranchChip>
            <GitBranch size={11} />
            <BranchText component="span">{repo.status.branch}</BranchText>
          </BranchChip>
        )}
        <AheadBehind ahead={ahead} behind={behind} variant="compact" />
      </BranchCell>

      <StatusCell>
        {dirty ? (
          <>
            <Diff component="span">
              <Box component="span" className="add">
                +{repo.added}
              </Box>
              <Box component="span" className="rem">
                −{repo.removed}
              </Box>
            </Diff>
            <FilesMeta component="span" variant="caption">
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </FilesMeta>
          </>
        ) : (
          <StatusText component="span" variant="caption">
            clean
          </StatusText>
        )}
      </StatusCell>

      <ActivityCell>
        <GeneralSparkline
          data={repo.activity}
          accentColor={dirty ? theme.palette.primary.main : undefined}
          width={110}
          height={28}
        />
      </ActivityCell>

      <Actions onClick={stop}>
        <RepoActions repo={repo} iconSize={IconButtonSize.MD} />
      </Actions>
    </Row>
  );
}
