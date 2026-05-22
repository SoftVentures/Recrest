import { useEffect, useState } from "react";

import { Box, Collapse } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type PullRequest, TauriCommand } from "@recrest/shared";

import {
  ChevronDown,
  ChevronRight,
  Code,
  ExternalLink,
  GitBranch,
  GitMerge,
  X,
} from "lucide-react";
import { toast } from "sonner";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { detailKey, loadPrDetail } from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface MrDetailPanelProps {
  pr: PullRequest;
  repoId: string;
  repoName?: string;
  onClose?: () => void;
}

type CiState = "passing" | "failing" | "running" | null;

function ciFor(status: string | null | undefined): CiState {
  if (status === "success") return "passing";
  if (status === "failure") return "failing";
  if (status === "running" || status === "pending") return "running";
  return null;
}

export function MrDetailPanel({ pr, repoId, repoName, onClose }: MrDetailPanelProps) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<null | "checkout" | "merge">(null);
  const detail = useAppSelector((s) => s.prs.detail[detailKey(repoId, pr.number)]);
  const detailLoading = useAppSelector(
    (s) => s.prs.detailLoading[detailKey(repoId, pr.number)] ?? false,
  );

  useEffect(() => {
    if (isTauri()) {
      void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
    }
  }, [dispatch, repoId, pr.number]);

  const brand = brandFromUrl(pr.url);
  const ci = ciFor(pr.ciStatus);

  const onCheckout = async () => {
    if (!isTauri()) return;
    setBusy("checkout");
    try {
      await invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.sourceBranch });
      toast.success(`Checked out ${pr.sourceBranch}`);
    } catch {
      toast.error("Checkout failed");
    } finally {
      setBusy(null);
    }
  };

  const onMerge = async () => {
    if (!isTauri()) return;
    setBusy("merge");
    try {
      await invoke(TauriCommand.GIT_MERGE, {
        repoId,
        source: pr.sourceBranch,
        target: pr.targetBranch,
        message: `Merge '${pr.sourceBranch}' into ${pr.targetBranch} (#${pr.number})`,
      });
      toast.success("Merged");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Merge failed: ${msg}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel data-testid="mr-detail-panel">
      <Header>
        <HeaderTopRow>
          <PrIcon data-draft={pr.draft ? "true" : undefined}>
            <GitMerge size={16} />
          </PrIcon>
          <HeaderTitleStack>
            <Title>{pr.title}</Title>
            <Subtitle>
              <span>#{pr.number}</span>
              {repoName && (
                <>
                  <Sep>·</Sep>
                  <span>{repoName}</span>
                </>
              )}
              {pr.draft && (
                <>
                  <Sep>·</Sep>
                  <DraftPill>draft</DraftPill>
                </>
              )}
            </Subtitle>
          </HeaderTitleStack>
          <HeaderCtrls>
            <GeneralTooltip title="Open on host" placement="top">
              <span>
                <IconBtn
                  type="button"
                  aria-label="Open on host"
                  onClick={() => void openExternal(pr.url)}
                >
                  {brand ? <GeneralBrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
                </IconBtn>
              </span>
            </GeneralTooltip>
            {onClose && (
              <GeneralTooltip title="Close" placement="top">
                <span>
                  <IconBtn type="button" aria-label="Close drawer" onClick={onClose}>
                    <X size={14} />
                  </IconBtn>
                </span>
              </GeneralTooltip>
            )}
          </HeaderCtrls>
        </HeaderTopRow>

        <ActionRow>
          <PrimaryAction
            type="button"
            onClick={() => void onMerge()}
            disabled={busy !== null || pr.draft}
          >
            <GitMerge size={13} />
            <span>{busy === "merge" ? "Merging…" : "Merge"}</span>
          </PrimaryAction>
          <GhostBtn type="button" onClick={() => void onCheckout()} disabled={busy !== null}>
            <Code size={13} />
            <span>{busy === "checkout" ? "…" : "Checkout"}</span>
          </GhostBtn>
        </ActionRow>
      </Header>

      <InfoStrip>
        <InfoCell>
          <InfoLabel>Branch</InfoLabel>
          <InfoValue>
            <BranchChip>
              <BranchGlyph>
                <GitBranch size={10} aria-hidden />
              </BranchGlyph>
              <BranchName>{pr.sourceBranch}</BranchName>
            </BranchChip>
            <Arrow>→</Arrow>
            <BranchChip>
              <BranchGlyph>
                <GitBranch size={10} aria-hidden />
              </BranchGlyph>
              <BranchName>{pr.targetBranch}</BranchName>
            </BranchChip>
          </InfoValue>
        </InfoCell>
        <InfoCell>
          <InfoLabel>Changes</InfoLabel>
          <InfoValue>
            {pr.additions != null && pr.deletions != null ? (
              <Diff>
                <span className="add">+{pr.additions}</span>
                <span className="rem">−{pr.deletions}</span>
              </Diff>
            ) : (
              "—"
            )}
          </InfoValue>
        </InfoCell>
        <InfoCell>
          <InfoLabel>CI</InfoLabel>
          <InfoValue>
            {ci ? (
              <CiPill>
                <CiDot data-state={ci} />
                <span>{ci}</span>
              </CiPill>
            ) : (
              <Muted>—</Muted>
            )}
          </InfoValue>
        </InfoCell>
      </InfoStrip>

      <Body>
        <Section
          title="Reviewers"
          count={detail?.reviewers.length ?? 0}
          loading={detailLoading && !detail}
        >
          {!detail || detail.reviewers.length === 0 ? (
            <Empty>No reviewers requested</Empty>
          ) : (
            <ReviewerChips>
              {detail.reviewers.map((r) => (
                <ReviewerChip key={r.login} data-state={r.state}>
                  <GeneralAuthorAvatar name={r.name ?? r.login} size={14} />
                  <span>{r.login}</span>
                  <ReviewerState>{r.state.replace("_", " ")}</ReviewerState>
                </ReviewerChip>
              ))}
            </ReviewerChips>
          )}
        </Section>

        <Section title="Files" count={detail?.files.length ?? 0} loading={detailLoading && !detail}>
          {!detail ? (
            <Empty>Loading files…</Empty>
          ) : detail.files.length === 0 ? (
            <Empty>No file changes to show</Empty>
          ) : (
            <FilesList>
              {detail.files.slice(0, 30).map((f) => (
                <FileItem key={f.path}>
                  <FilePath>{f.path}</FilePath>
                  <FileDiff>
                    <span className="add">+{f.additions}</span>
                    <span className="rem">−{f.deletions}</span>
                  </FileDiff>
                </FileItem>
              ))}
            </FilesList>
          )}
        </Section>

        <Section
          title="Timeline"
          count={detail?.timeline.length ?? 0}
          loading={detailLoading && !detail}
          defaultOpen={false}
        >
          {!detail || detail.timeline.length === 0 ? (
            <Empty>No timeline events</Empty>
          ) : (
            <TimelineList>
              {detail.timeline.slice(0, 30).map((evt) => (
                <TimelineItem key={evt.id + evt.at}>
                  <TimelineHead>
                    <TimelineType>{evt.type.replace(/_/g, " ")}</TimelineType>
                    {evt.actor && <Muted>· {evt.actor}</Muted>}
                    <Muted>· {evt.at.slice(0, 10)}</Muted>
                  </TimelineHead>
                  {evt.body && <TimelineBody>{evt.body}</TimelineBody>}
                </TimelineItem>
              ))}
            </TimelineList>
          )}
        </Section>

        <Section title="Metadata" count={0} defaultOpen={false} hideCount>
          <Meta>
            <div>
              <Muted>Opened</Muted>: {pr.createdAt.slice(0, 10)}
            </div>
            <div>
              <Muted>Updated</Muted>: {pr.updatedAt.slice(0, 10)}
            </div>
          </Meta>
        </Section>
      </Body>

      <Footer>
        <FullCta type="button" onClick={() => void openExternal(pr.url)}>
          <ExternalLink size={13} />
          <span>Open on host</span>
        </FullCta>
      </Footer>
    </Panel>
  );
}

interface SectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  loading?: boolean;
  hideCount?: boolean;
  children: React.ReactNode;
}

function Section({ title, count, defaultOpen = true, hideCount = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionBox>
      <SectionHead type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <SectionTitle>{title}</SectionTitle>
        {!hideCount && <SectionCount>{count}</SectionCount>}
      </SectionHead>
      <Collapse in={open} timeout="auto">
        <SectionBody>{children}</SectionBody>
      </Collapse>
    </SectionBox>
  );
}

const Panel = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.surface.interface.base,
  overflow: "hidden",
}));

const Header = styled(Box)(({ theme }) => ({
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const HeaderTopRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
});

const PrIcon = styled(Box)(({ theme }) => ({
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.success.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.success.main} 15%, transparent)`,
  flexShrink: 0,
  "&[data-draft='true']": {
    color: theme.palette.text.information,
    backgroundColor: theme.palette.surface.interface.backElevation,
  },
}));

const HeaderTitleStack = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const Title = styled("div")(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  lineHeight: 1.25,
}));

const Subtitle = styled("div")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginTop: 4,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const Sep = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
}));

const DraftPill = styled("span")(({ theme }) => ({
  padding: "1px 6px",
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 600,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}));

const HeaderCtrls = styled(Box)({
  display: "flex",
  gap: 4,
  alignItems: "center",
});

const IconBtn = styled("button")(({ theme }) => ({
  width: 26,
  height: 26,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
}));

const ActionRow = styled(Box)({
  display: "flex",
  gap: 6,
  // Merge + Checkout share the available width like the original mocks.
  "& > button": {
    flex: 1,
    minWidth: 0,
  },
});

const PrimaryAction = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
  "&:disabled": { opacity: 0.5, cursor: "default" },
}));

const GhostBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:disabled": { opacity: 0.5, cursor: "default" },
}));

const InfoStrip = styled(Box)(({ theme }) => ({
  display: "grid",
  // Branch cell takes the lion's share, Changes (~70 px content) and CI
  // (~70 px content) get just enough to render without ellipsis at the
  // 360 px drawer width.
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 0.9fr)",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const InfoCell = styled(Box)(({ theme }) => ({
  padding: "10px 12px",
  borderRight: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderRight: 0 },
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
}));

const InfoLabel = styled("div")(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
}));

const InfoValue = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  minWidth: 0,
  flexWrap: "nowrap",
  overflow: "hidden",
});

const BranchChip = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 6px",
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  color: theme.palette.text.primary,
  minWidth: 0,
  whiteSpace: "nowrap",
}));

const BranchGlyph = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  color: theme.palette.text.information,
  flexShrink: 0,
}));

const BranchName = styled("span")({
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 10.5,
});

const Arrow = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
}));

const Diff = styled("span")(({ theme }) => ({
  display: "inline-flex",
  gap: 4,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
}));

const Muted = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
}));

const CiPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
  textTransform: "capitalize",
}));

const CiDot = styled("span")(({ theme }) => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  "&[data-state='passing']": { backgroundColor: theme.palette.success.main },
  "&[data-state='failing']": { backgroundColor: theme.palette.error.main },
  "&[data-state='running']": { backgroundColor: theme.palette.warning.main },
}));

const Body = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
});

const SectionBox = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SectionHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "10px 16px",
  border: 0,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const SectionTitle = styled("span")({
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  flex: 1,
});

const SectionCount = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const SectionBody = styled(Box)({
  padding: "0 16px 12px",
});

const Empty = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.informationLight,
  fontStyle: "italic",
  padding: "4px 0",
}));

const ReviewerChips = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
});

const ReviewerChip = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 8px",
  borderRadius: 100,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  color: theme.palette.text.primary,
  "&[data-state='approved']": {
    borderColor: `color-mix(in srgb, ${theme.palette.success.main} 40%, transparent)`,
    color: theme.palette.success.main,
  },
  "&[data-state='changes_requested']": {
    borderColor: `color-mix(in srgb, ${theme.palette.error.main} 40%, transparent)`,
    color: theme.palette.error.main,
  },
}));

const ReviewerState = styled("span")({
  fontSize: 10,
  textTransform: "capitalize",
  opacity: 0.75,
});

const FilesList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 240,
  overflow: "auto",
});

const FileItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "4px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  fontSize: 11.5,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
}));

const FilePath = styled("span")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: theme.palette.text.primary,
}));

const FileDiff = styled("span")(({ theme }) => ({
  display: "inline-flex",
  gap: 5,
  fontSize: 10.5,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
}));

const TimelineList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 240,
  overflow: "auto",
});

const TimelineItem = styled(Box)(({ theme }) => ({
  padding: "6px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  fontSize: 11.5,
}));

const TimelineHead = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 5,
  flexWrap: "wrap",
});

const TimelineType = styled("span")(({ theme }) => ({
  fontWeight: 600,
  textTransform: "capitalize",
  color: theme.palette.text.primary,
}));

const TimelineBody = styled("div")(({ theme }) => ({
  marginTop: 2,
  color: theme.palette.text.information,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
}));

const Meta = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: theme.palette.text.primary,
}));

const Footer = styled(Box)(({ theme }) => ({
  padding: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const FullCta = styled("button")(({ theme }) => ({
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));
