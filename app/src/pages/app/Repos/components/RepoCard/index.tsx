import { type KeyboardEvent, type MouseEvent } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { TauriCommand, type TauriCommandName } from "@recrest/shared";

import {
  ExternalLink,
  Folder,
  GitBranch,
  MoreHorizontal,
  Terminal as TerminalLucide,
} from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import OpenInIdeButton from "@/components/atoms/buttons/OpenInIdeButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import AheadBehind from "@/components/atoms/git/AheadBehind";
import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
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
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const theme = useTheme();
  const dirty = !!repo.status.dirty;
  const brand = brandFromUrl(repo.remoteUrl);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const run = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error(`${label} failed`);
    }
  };

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
          <OpenInIdeButton repoId={repo.id} iconSize={IconButtonSize.SM} />
          <GeneralTooltip title="Open Terminal" placement="top">
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={tAria("repo.open_in_terminal")}
              onClick={() => void run(TauriCommand.OPEN_TERMINAL, "Terminal")}
              icon={<TerminalLucide size={13} />}
            />
          </GeneralTooltip>
          <GeneralTooltip
            title={repo.remoteUrl ? "Open on host" : "No remote configured"}
            placement="top"
          >
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={tAria("repo.open_remote")}
              disabled={!repo.remoteUrl}
              onClick={() => repo.remoteUrl && void openExternal(repo.remoteUrl)}
              icon={brand ? <BrandIcon slug={brand} size={13} /> : <ExternalLink size={13} />}
            />
          </GeneralTooltip>
          <GeneralTooltip title="Open in Explorer" placement="top">
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={tAria("repo.open_in_explorer")}
              onClick={() => void run(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
              icon={<Folder size={13} />}
            />
          </GeneralTooltip>
          <GeneralTooltip title="More" placement="top">
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={tAria("repo.more_actions")}
              icon={<MoreHorizontal size={13} />}
            />
          </GeneralTooltip>
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
