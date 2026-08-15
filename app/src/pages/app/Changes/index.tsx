import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, TauriCommand } from "@recrest/shared";

import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { toast } from "sonner";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import RepoContextMenu from "@/components/molecules/menus/RepoContextMenu";
import ChangedFilesList from "@/components/organisms/repos/ChangedFilesList";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const PageRoot = styled(Box)({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
}) as typeof Box;

const ToolbarRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(12),
  padding: pxToRems(12, 24),
  paddingRight: `calc(${pxToRem(24)} + var(--recrest-scrollbar-width, 0px))`,
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

const Scroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  scrollbarGutter: "stable",
  paddingBottom: pxToRem(24),
}) as typeof Box;

const Card = styled(Box)(({ theme }) => ({
  margin: theme.spacing(0, 3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.surface.interface.base,
  overflow: "hidden",
})) as typeof Box;

const RepoBlock = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  "&[data-context-menu-open='true']": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`,
  },
})) as typeof Box;

const RowHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(12),
  width: "100%",
  padding: pxToRems(12, 16),
  cursor: "pointer",
  transition: "background-color 120ms ease",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
})) as typeof Box;

const Chevron = styled(Box)({
  display: "inline-flex",
  flexShrink: 0,
  width: pxToRem(16),
}) as typeof Box;

const NameCol = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const RepoName = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const RepoPath = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

// Every other item in `RowHeader` is `flexShrink: 0`, so a long ref (a
// dependabot or feature/JIRA-1234-… branch) used to push the diff counts and
// the action buttons out of the card's `overflow: hidden`. The chip now shrinks
// and truncates instead; `maxWidth` keeps it from eating the repo name first.
const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 8),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(11),
  fontWeight: 500,
  flex: "0 1 auto",
  minWidth: 0,
  maxWidth: 240,
  overflow: "hidden",
  "& > span": {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
})) as typeof Box;

const DiffMeta = styled(Box)({
  display: "inline-flex",
  alignItems: "baseline",
  gap: pxToRem(6),
  fontVariantNumeric: "tabular-nums",
  fontSize: fontPxToRem(12),
  flexShrink: 0,
}) as typeof Box;

const Added = styled(Box)(({ theme }) => ({
  color: toneText(theme, StatusTone.SUCCESS),
  fontWeight: 600,
})) as typeof Box;

const Removed = styled(Box)(({ theme }) => ({
  color: toneText(theme, StatusTone.ERROR),
  fontWeight: 600,
})) as typeof Box;

// No ellipsis companion to `nowrap` on purpose: this is a two-token count
// ("12 files" / "12 Dateien") where "12 fi…" would be worse than the whole
// label. The row's slack comes from `NameCol` and the truncating `BranchChip`.
const FilesMeta = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  whiteSpace: "nowrap",
  flexShrink: 0,
})) as typeof Typography;

const Actions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  flexShrink: 0,
}) as typeof Box;

const FilesPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 2, 2, 5),
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default,
})) as typeof Box;

const FilesPanelInner = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(1.5),
})) as typeof Box;

interface ChangesRowProps {
  repo: EnrichedRepo;
  expanded: boolean;
  onToggle: () => void;
}

function ChangesRow({ repo, expanded, onToggle }: ChangesRowProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(I18nNamespace.REPOS);
  const pull = useActionFeedback();
  const ctx = useContextMenu();

  const onCommit = () => {
    if (!isTauri()) {
      toast.info(t("changes.toast_desktop_only"));
      return;
    }
    navigate(AppRoute.REPO.replace(":repoId", repo.id));
  };

  const onPull = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTauri()) return;
    try {
      await pull.run(() => invoke(TauriCommand.GIT_PULL, { repoId: repo.id }));
      toast.success(t("changes.toast_pulled"));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("changes.toast_pull_failed"));
    }
  };

  const fileCount = repo.filesChanged;

  return (
    <RepoBlock
      data-testid={TEST_IDS.changes.row}
      data-repo-id={repo.id}
      data-context-menu-open={ctx.open ? "true" : undefined}
    >
      <RowHeader
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onContextMenu={ctx.onContextMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        aria-label={expanded ? t("changes.collapse_aria") : t("changes.expand_aria")}
      >
        <Chevron component="span" aria-hidden>
          {expanded ? <ChevronDown size={pxToRem(14)} /> : <ChevronRight size={pxToRem(14)} />}
        </Chevron>
        <RepoAvatar repo={repo} size={28} radius={6} />
        <NameCol>
          <RepoName>{repo.name}</RepoName>
          <RepoPath>{repo.path}</RepoPath>
        </NameCol>
        {repo.status.branch && (
          <BranchChip>
            <GitBranch size={pxToRem(11)} />
            <Box component="span">{repo.status.branch}</Box>
          </BranchChip>
        )}
        <DiffMeta>
          <Added component="span">+{repo.added}</Added>
          <Removed component="span">−{repo.removed}</Removed>
        </DiffMeta>
        <FilesMeta>{t("changes.files", { count: fileCount })}</FilesMeta>
        <Actions>
          <GeneralButton
            variant="outline"
            size="sm"
            disabled={pull.state === "loading"}
            onClick={(e) => {
              e.stopPropagation();
              onCommit();
            }}
          >
            {t("changes.open")}
          </GeneralButton>
          <GeneralButton
            variant="ghost"
            size="sm"
            feedbackState={pull.state}
            onClick={(e) => void onPull(e)}
          >
            {t("changes.pull")}
          </GeneralButton>
        </Actions>
      </RowHeader>
      {expanded && repo.status.changedFiles.length > 0 && (
        <FilesPanel>
          <FilesPanelInner>
            <ChangedFilesList
              files={repo.status.changedFiles}
              truncated={repo.status.changedFilesTruncated}
              maxHeight="auto"
            />
          </FilesPanelInner>
        </FilesPanel>
      )}
      <RepoContextMenu repo={repo} position={ctx.position} onClose={ctx.onClose} />
    </RepoBlock>
  );
}

export default function ChangesPage() {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const repos = useEnrichedRepos();
  const dirtyRepos = useMemo(() => repos.filter((r) => r.status.dirty), [repos]);

  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return dirtyRepos;
    return dirtyRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.status.changedFiles.some((f) => f.path.toLowerCase().includes(q)),
    );
  }, [dirtyRepos, filter]);

  const toggle = (id: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (dirtyRepos.length === 0) {
    return (
      <PageRoot data-testid={TEST_IDS.changes.page}>
        <Scroll>
          <EmptyState
            mascot="celebrating"
            title={t("changes.empty_clean_title")}
            description={t("changes.empty_clean_desc")}
          />
        </Scroll>
      </PageRoot>
    );
  }

  return (
    <PageRoot data-testid={TEST_IDS.changes.page}>
      <ToolbarRow>
        <GeneralSearchInput
          value={filter}
          onChange={setFilter}
          placeholder={t("changes.filter_placeholder")}
          aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
          clearLabel={t("search.clear", { ns: I18nNamespace.ARIA })}
        />
      </ToolbarRow>
      <Scroll>
        {filtered.length === 0 ? (
          <EmptyState
            mascot="shrugging"
            title={t("changes.empty_no_matches_title")}
            description={t("changes.empty_no_matches_desc")}
          />
        ) : (
          <Card>
            {filtered.map((repo) => (
              <ChangesRow
                key={repo.id}
                repo={repo}
                expanded={expanded.has(repo.id)}
                onToggle={() => toggle(repo.id)}
              />
            ))}
          </Card>
        )}
      </Scroll>
    </PageRoot>
  );
}
