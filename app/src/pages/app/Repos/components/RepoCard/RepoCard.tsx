import { type KeyboardEvent, type MouseEvent } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand, type TauriCommandName } from "@recrest/shared";

import {
  ExternalLink,
  Folder,
  GitBranch,
  MoreHorizontal,
  Terminal as TerminalLucide,
} from "lucide-react";
import { toast } from "sonner";

import GeneralSparkline from "@/components/atoms/data/GeneralSparkline";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import GeneralIdeIcon from "@/components/atoms/icons/IdeIcon";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";

export interface RepoCardProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onClick?: (repo: EnrichedRepo) => void;
}

export function RepoCard({ repo, selected, onClick }: RepoCardProps) {
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
      data-testid="repo-card"
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onClick?.(repo)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(repo);
        }
      }}
    >
      <CardTop>
        <GeneralRepoAvatar repo={repo} size={36} radius={8} />
        <Actions onClick={stop}>
          <GeneralTooltip title="Open in VS Code" placement="top">
            <ActionBtn
              type="button"
              aria-label="Open in IDE"
              onClick={() => void run(TauriCommand.OPEN_IN_IDE, "Open in IDE")}
            >
              <GeneralIdeIcon id="vscode" size={13} />
            </ActionBtn>
          </GeneralTooltip>
          <GeneralTooltip title="Open Terminal" placement="top">
            <ActionBtn
              type="button"
              aria-label="Open in Terminal"
              onClick={() => void run(TauriCommand.OPEN_TERMINAL, "Terminal")}
            >
              <TerminalLucide size={13} />
            </ActionBtn>
          </GeneralTooltip>
          <GeneralTooltip
            title={repo.remoteUrl ? "Open on host" : "No remote configured"}
            placement="top"
          >
            <ActionBtn
              type="button"
              aria-label="Open remote"
              disabled={!repo.remoteUrl}
              onClick={() => repo.remoteUrl && void openExternal(repo.remoteUrl)}
            >
              {brand ? <GeneralBrandIcon slug={brand} size={13} /> : <ExternalLink size={13} />}
            </ActionBtn>
          </GeneralTooltip>
          <GeneralTooltip title="Open in Explorer" placement="top">
            <ActionBtn
              type="button"
              aria-label="Open in Explorer"
              onClick={() => void run(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
            >
              <Folder size={13} />
            </ActionBtn>
          </GeneralTooltip>
          <GeneralTooltip title="More" placement="top">
            <ActionBtn type="button" aria-label="More">
              <MoreHorizontal size={13} />
            </ActionBtn>
          </GeneralTooltip>
        </Actions>
      </CardTop>

      <Body>
        <Name data-testid="repo-card-name">{repo.name}</Name>
        <Path>{repo.path}</Path>
        <BranchRow>
          <BranchChip>
            <GitBranch size={11} />
            <BranchText>{repo.status.branch ?? "—"}</BranchText>
          </BranchChip>
          {(repo.status.ahead > 0 || repo.status.behind > 0) && (
            <AheadBehind>
              {repo.status.ahead > 0 && <span>↑{repo.status.ahead}</span>}
              {repo.status.behind > 0 && <span>↓{repo.status.behind}</span>}
            </AheadBehind>
          )}
        </BranchRow>
      </Body>

      <Footer>
        <StatusGroup>
          <StatusDot data-dirty={dirty ? "true" : undefined} />
          {dirty ? (
            <Diff>
              <span className="add">+{repo.added}</span>
              <span className="rem">−{repo.removed}</span>
              <FilesMeta>· {repo.filesChanged} files</FilesMeta>
            </Diff>
          ) : (
            <StatusText>clean</StatusText>
          )}
        </StatusGroup>
        <GeneralSparkline data={repo.activity} active={dirty} width={88} height={18} />
      </Footer>
    </Card>
  );
}

const Card = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 14,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  cursor: "pointer",
  transition: "border-color 0.12s ease, background-color 0.12s ease",
  "&:hover": {
    borderColor: theme.palette.border.hover,
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&[data-selected='true']": {
    borderColor: theme.palette.primary.main,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 6%, transparent)`,
  },
  // Mount stagger: cards rise in row by row.
  animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 40, count: 10 }),
  ...prefersReducedMotionGuard,
}));

const CardTop = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

const Actions = styled(Box)({
  display: "flex",
  gap: 4,
});

const ActionBtn = styled("button")(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 8,
  border: `1px solid transparent`,
  backgroundColor: "transparent",
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.interface.backElevation,
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
  },
  "&:disabled": { opacity: 0.4, cursor: "default" },
}));

const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
});

const Name = styled("div")(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const Path = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const BranchRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
});

const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 8px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  maxWidth: 170,
  minWidth: 0,
}));

const BranchText = styled("span")({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
});

const AheadBehind = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
}));

const Footer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

const StatusGroup = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

const StatusDot = styled("span")(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: theme.palette.success.main,
  flexShrink: 0,
  "&[data-dirty='true']": {
    backgroundColor: theme.palette.warning.main,
  },
}));

const StatusText = styled("span")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const Diff = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
}));

const FilesMeta = styled("span")(({ theme }) => ({
  color: theme.palette.text.information,
  fontWeight: 400,
}));
