import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

import { type BranchInfo, EventChannel, TauriCommand } from "@recrest/shared";

import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  GitBranch as BranchIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Filter,
  Laptop,
  ListChecks,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import {
  PAGE_DUR_MD,
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  pgRise,
  pgZoom,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, listen } from "@/lib/tauri";
import { loadRepos } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

type TrackingFlag = "ahead" | "behind" | "clean";
type LocationFlag = "local" | "remote";

interface BranchesByRepo {
  repo: EnrichedRepo;
  branches: BranchInfo[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Mirrors src-old `.a-branches` + `.a-br-*` SCSS rules.
 * - Toolbar: search pill (radius 100px) + Fetch-all (height 32) + Filter
 *   trigger, fetch-all pushed to the right with margin-left: auto.
 * - Groups: surface-1 card, surface-2 header strip with name + remote URL +
 *   branch count + per-repo Fetch button.
 * - Rows: 8px dot column, name+pills column (1fr), meta column (1.2fr), and
 *   a fixed 280px "tail" column for actions + track indicator. Action
 *   buttons hide until row-hover so the resting row reads quietly.
 * ──────────────────────────────────────────────────────────────────────── */

const Root = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
});

const Page = styled(Box)({
  // Matches baseline `.a-content` (18px 22px 80px) plus `.a-branches` gap 20.
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not. Keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
  padding: "18px 22px 80px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
});

/* ─── Toolbar (search pill · fetch all · filter) ─── */

const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "4px 0",
  flexWrap: "wrap",
  // Toolbar drops in — matches src-old `.p-branches .a-br-toolbar`.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
});

const SearchPill = styled("label")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  height: 32,
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  color: theme.palette.text.information,
  minWidth: 180,
  flex: "0 1 240px",
  transition: "border-color 0.12s ease, color 0.12s ease",
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
  },
}));

const SearchInput = styled("input")(({ theme }) => ({
  border: 0,
  outline: "none",
  background: "transparent",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12,
  width: "100%",
  padding: 0,
  "&::placeholder": { color: theme.palette.text.informationLight },
}));

const ClearBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  cursor: "pointer",
  borderRadius: "50%",
  padding: 0,
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const ToolbarBtn = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:disabled": {
    opacity: 0.55,
    cursor: "default",
  },
  ...(active && {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  }),
}));

const FetchAllBtn = styled(ToolbarBtn)({
  // Push Fetch-all + Filter cluster to the right edge of the toolbar so the
  // pill stays left-aligned and the action zone reads as a single grouping.
  marginLeft: "auto",
});

const SpinIcon = styled(RefreshCw)({
  animation: "branchSpin 0.9s linear infinite",
  "@keyframes branchSpin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
});

const FilterBadge = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.background.paper,
  marginLeft: 2,
}));

/* ─── Repo group (card with sticky header) ─── */

const Groups = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

const GroupCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  // Mount stagger: each repo card zooms in 80ms after the previous —
  // matches src-old `.p-branches .a-br-group`.
  animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 80, count: 8 }),
  ...prefersReducedMotionGuard,
}));

const GroupHead = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 16px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const GroupHandle = styled("div")(({ theme }) => ({
  // Keeps chevron + avatar + name + remote in a clickable cluster while the
  // Fetch button stays a real, hover-able sibling. Nested-interactive HTML
  // is avoided by using a div role=button rather than wrapping in <button>.
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
  minWidth: 0,
  cursor: "pointer",
  color: theme.palette.text.primary,
  background: "transparent",
  border: 0,
  fontFamily: "inherit",
  textAlign: "left",
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
    borderRadius: 8,
  },
}));

const GroupName = styled("span")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.1px",
}));

const GroupRemote = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const GroupCount = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

// Group-header Fetch button = `.r-btn.sm.ghost`: height 24, transparent surface
// and transparent border, ink-2 text colour, hover swaps to surface-hover BG +
// ink-0 text. No frame at rest so the strip reads quietly until interacted with.
const FetchBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 24,
  padding: "0 8px",
  marginLeft: 4,
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: 8,
  color: theme.palette.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 120ms ease, color 120ms ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
  "&:disabled": { opacity: 0.55, cursor: "default" },
}));

/* ─── Branch rows ─── */

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
});

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  // 8px dot · name+pills column · meta column · 280px fixed tail (actions + track).
  // The fixed tail keeps `tracks …` / `by …` aligned across rows regardless of
  // how many action buttons are visible on hover.
  gridTemplateColumns: "8px minmax(0, 1fr) minmax(0, 1.2fr) 280px",
  alignItems: "center",
  columnGap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:hover [data-row-acts]": {
    visibility: "visible",
  },
  "&:focus-within [data-row-acts]": {
    visibility: "visible",
  },
  // Mount stagger: rows rise after their group card has zoomed in
  // (~80ms base) then 40ms between rows. Matches src-old
  // `.p-branches .a-br-row`.
  animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 40, count: 10, base: 80 }),
  ...prefersReducedMotionGuard,
}));

const Dot = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "neutral" | "current" | "clean" | "remote" }>(({ theme, tone }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
  ...(tone === "neutral" && {
    backgroundColor: theme.palette.text.informationLight,
  }),
  ...(tone === "current" && {
    backgroundColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
  }),
  ...(tone === "clean" && {
    backgroundColor: theme.palette.text.information,
    opacity: 0.5,
  }),
  ...(tone === "remote" && {
    backgroundColor: "transparent",
    border: `1.5px dashed ${theme.palette.text.information}`,
  }),
}));

const NameCell = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12.5,
  color: theme.palette.text.primary,
  "& > svg": {
    color: theme.palette.text.information,
    flexShrink: 0,
  },
  "& > span:first-of-type": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

const Tag = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "current" | "dirty" | "clean" | "remote" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "2px 7px",
  borderRadius: 100,
  ...(tone === "current" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  }),
  ...(tone === "dirty" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 18%, transparent)`,
    color: theme.palette.warning.dark,
  }),
  ...(tone === "clean" && {
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.information,
  }),
  ...(tone === "remote" && {
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.secondary,
  }),
}));

const Meta = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontSize: 11,
  color: theme.palette.text.information,
  minWidth: 0,
}));

const MetaLine = styled("span")({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minHeight: 14,
});

const Tail = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "flex-end",
});

const Acts = styled(Box)({
  display: "flex",
  gap: 4,
  visibility: "hidden",
});

const RowBtn = styled("button", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone?: "primary" | "ghost" }>(({ theme, tone = "ghost" }) => {
  const isDark = theme.palette.mode === "dark";
  const primaryBg = isDark ? "#0f1115" : theme.palette.text.primary;
  const primaryFg = isDark ? "#ffffff" : theme.palette.background.paper;
  const primaryHover = isDark ? "#1a1d24" : theme.palette.text.secondary;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 24,
    padding: "0 8px",
    border: "1px solid transparent",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
    ...(tone === "primary"
      ? {
          backgroundColor: primaryBg,
          borderColor: primaryBg,
          color: primaryFg,
          "&:hover": { backgroundColor: primaryHover, borderColor: primaryHover },
        }
      : {
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: theme.palette.surface.interface.active,
            color: theme.palette.text.primary,
          },
        }),
    "&:disabled": { opacity: 0.55, cursor: "default" },
  };
});

const Track = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  fontVariantNumeric: "tabular-nums",
});

const Trk = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "ahead" | "behind" | "even" }>(({ theme, tone }) => ({
  fontWeight: tone === "even" ? 400 : 600,
  color:
    tone === "ahead"
      ? theme.palette.success.dark
      : tone === "behind"
        ? theme.palette.warning.dark
        : theme.palette.text.information,
}));

/* ─── Filter popover ─── */

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: "6px 12px 4px",
})) as typeof Typography;

const FilterItem = styled(MenuItem)({
  position: "relative",
  fontSize: 13,
  minHeight: 30,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 32,
  paddingRight: 8,
  gap: 8,
  borderRadius: 8,
  margin: "0 4px",
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiListItemText-primary": { fontSize: 13 },
});

const LeadingSlot = styled("span")(({ theme }) => ({
  position: "absolute",
  left: 8,
  top: "50%",
  width: 14,
  height: 14,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.primary,
  flexShrink: 0,
}));

const CountSpan = styled("span")(({ theme }) => ({
  marginLeft: "auto",
  fontSize: 10,
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
}));

const Empty = styled(Box)(({ theme }) => ({
  padding: "24px",
  textAlign: "center",
  color: theme.palette.text.information,
  fontSize: 13,
}));

interface PopoverChipProps {
  label: string;
  count?: number;
  active: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}

function PopoverChip({ label, count, active, onSelect, icon }: PopoverChipProps) {
  return (
    <FilterItem
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <LeadingSlot>{active && <Check size={14} />}</LeadingSlot>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={label} />
      {count !== undefined && <CountSpan>{count}</CountSpan>}
    </FilterItem>
  );
}

/* ─── Data hook ─── */

function useBranchesByRepo(repos: EnrichedRepo[]): {
  data: BranchesByRepo[];
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<BranchesByRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const repoIdsKey = useMemo(
    () =>
      repos
        .map((r) => r.id)
        .sort()
        .join("|"),
    [repos],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const results = await Promise.all(
        repos.map(async (repo) => {
          try {
            const branches = await invoke<BranchInfo[]>(TauriCommand.GIT_LIST_BRANCHES, {
              repoId: repo.id,
            });
            return { repo, branches };
          } catch {
            return { repo, branches: [] as BranchInfo[] };
          }
        }),
      );
      if (cancelled) return;
      setData(results);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoIdsKey, nonce]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen<{ repoId: string }>(EventChannel.REPO_STATUS, () => {
        reload();
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [reload]);

  return { data, loading, reload };
}

/* ─── Page ─── */

export default function BranchesPage() {
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [tracking, setTracking] = useState<TrackingFlag | null>(null);
  const [location, setLocation] = useState<LocationFlag | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: byRepoAll, loading, reload } = useBranchesByRepo(repos);

  const run = async (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => {
    setBusyKey(key);
    try {
      await invoke(cmd, args);
      toast.success(okMsg);
      void dispatch(loadRepos());
      reload();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : `${cmd} failed`;
      toast.error(msg);
    } finally {
      setBusyKey(null);
    }
  };

  const totals = useMemo(() => {
    let all = 0;
    let ahead = 0;
    let behind = 0;
    let clean = 0;
    let local = 0;
    let remote = 0;
    for (const { branches } of byRepoAll) {
      for (const b of branches) {
        all += 1;
        if (b.ahead > 0) ahead += 1;
        if (b.behind > 0) behind += 1;
        if (b.clean) clean += 1;
        if (b.isRemote) remote += 1;
        else local += 1;
      }
    }
    return { all, ahead, behind, clean, local, remote };
  }, [byRepoAll]);

  const byRepo = useMemo<BranchesByRepo[]>(() => {
    const matchTracking = (b: BranchInfo) => {
      if (tracking === null) return true;
      if (tracking === "ahead") return b.ahead > 0;
      if (tracking === "behind") return b.behind > 0;
      if (tracking === "clean") return b.clean;
      return true;
    };
    const matchLocation = (b: BranchInfo) => {
      if (location === null) return true;
      if (location === "local") return !b.isRemote;
      if (location === "remote") return b.isRemote;
      return true;
    };
    const q = search.trim().toLowerCase();
    const matchSearch = (b: BranchInfo) => {
      if (!q) return true;
      const label = b.isRemote ? `${b.remote ?? ""}/${b.name}` : b.name;
      return label.toLowerCase().includes(q);
    };
    return byRepoAll
      .map(({ repo, branches }) => ({
        repo,
        branches: branches.filter((b) => matchTracking(b) && matchLocation(b) && matchSearch(b)),
      }))
      .filter(({ branches }) => branches.length > 0);
  }, [byRepoAll, tracking, location, search]);

  const activeFilterCount = (tracking ? 1 : 0) + (location ? 1 : 0);
  const fetchAllKey = "__all__:fetch";
  const fetchAllBusy = busyKey === fetchAllKey;

  return (
    <Root data-testid="branches-page">
      <Page>
        <Toolbar>
          <SearchPill>
            <Search size={12} aria-hidden />
            <SearchInput
              placeholder={t("branches.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="branches-search"
              aria-label={t("branches.search_aria")}
            />
            {search && (
              <ClearBtn
                type="button"
                aria-label={t("common.clear_search", { defaultValue: "Clear search" })}
                data-testid="branches-search-clear"
                onClick={() => setSearch("")}
              >
                <X size={11} aria-hidden />
              </ClearBtn>
            )}
          </SearchPill>
          <FetchAllBtn
            type="button"
            disabled={fetchAllBusy || repos.length === 0}
            onClick={() =>
              void run(
                fetchAllKey,
                TauriCommand.GIT_FETCH_ALL,
                {},
                t("branches.actions.fetched_all"),
              )
            }
            data-testid="branches-fetch-all"
          >
            {fetchAllBusy ? <SpinIcon size={12} /> : <RefreshCw size={12} />}
            {fetchAllBusy ? t("branches.actions.fetching") : t("branches.actions.fetch_all")}
          </FetchAllBtn>
          <ToolbarBtn
            type="button"
            data-testid="branches-filter-trigger"
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            active={activeFilterCount > 0}
          >
            <Filter size={14} aria-hidden />
            {t("branches.filter.button", { defaultValue: "Filter" })}
            {activeFilterCount > 0 && <FilterBadge>{activeFilterCount}</FilterBadge>}
            <ChevronDown size={14} aria-hidden />
          </ToolbarBtn>
          <Menu
            anchorEl={filterAnchor}
            open={!!filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { width: 240, mt: 0.5 } } }}
          >
            <SectionLabel>
              {t("branches.filter.tracking_label", { defaultValue: "Tracking" })}
            </SectionLabel>
            <PopoverChip
              icon={<ListChecks size={14} />}
              label={t("branches.filter.all")}
              count={totals.all}
              active={tracking === null}
              onSelect={() => setTracking(null)}
            />
            <PopoverChip
              icon={<ArrowUpFromLine size={14} />}
              label={t("branches.filter.ahead")}
              count={totals.ahead}
              active={tracking === "ahead"}
              onSelect={() => setTracking("ahead")}
            />
            <PopoverChip
              icon={<ArrowDownFromLine size={14} />}
              label={t("branches.filter.behind")}
              count={totals.behind}
              active={tracking === "behind"}
              onSelect={() => setTracking("behind")}
            />
            <PopoverChip
              icon={<CheckCircle2 size={14} />}
              label={t("branches.filter.clean")}
              count={totals.clean}
              active={tracking === "clean"}
              onSelect={() => setTracking("clean")}
            />
            <Divider sx={{ my: 0.5 }} />
            <SectionLabel>
              {t("branches.filter.location_label", { defaultValue: "Location" })}
            </SectionLabel>
            <PopoverChip
              icon={<ListChecks size={14} />}
              label={t("branches.filter.all")}
              count={totals.all}
              active={location === null}
              onSelect={() => setLocation(null)}
            />
            <PopoverChip
              icon={<Laptop size={14} />}
              label={t("branches.filter.local")}
              count={totals.local}
              active={location === "local"}
              onSelect={() => setLocation("local")}
            />
            <PopoverChip
              icon={<Cloud size={14} />}
              label={t("branches.filter.remote")}
              count={totals.remote}
              active={location === "remote"}
              onSelect={() => setLocation("remote")}
            />
            {activeFilterCount > 0 && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <FilterItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTracking(null);
                    setLocation(null);
                  }}
                >
                  <ListItemText
                    primary={t("branches.filter.reset", { defaultValue: "Reset filters" })}
                  />
                </FilterItem>
              </>
            )}
          </Menu>
        </Toolbar>

        <Groups>
          {!loading && byRepo.length === 0 && (
            <Empty>{repos.length === 0 ? t("branches.no_repos") : t("branches.empty")}</Empty>
          )}
          {byRepo.map((group) => (
            <RepoGroup key={group.repo.id} group={group} busyKey={busyKey} run={run} t={t} />
          ))}
        </Groups>
      </Page>
    </Root>
  );
}

interface RepoGroupProps {
  group: BranchesByRepo;
  busyKey: string | null;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RepoGroup({ group, busyKey, run, t }: RepoGroupProps) {
  const { repo, branches } = group;
  const [collapsed, setCollapsed] = useState(false);
  const fetchKey = `${repo.id}:fetch`;
  const isFetching = busyKey === fetchKey;
  const open = !collapsed;

  const toggle = () => setCollapsed((c) => !c);

  return (
    <GroupCard data-testid="branches-group" data-repo-id={repo.id} data-open={open || undefined}>
      <GroupHead>
        <GroupHandle
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <ChevronDown
            size={12}
            style={{
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 120ms ease",
            }}
          />
          <GeneralRepoAvatar repo={repo} size={22} radius={5} />
          <GroupName>{repo.name}</GroupName>
          <GroupRemote>{repo.remoteUrl ?? ""}</GroupRemote>
          <GroupCount>{t("branches.branches_count", { count: branches.length })}</GroupCount>
        </GroupHandle>
        <FetchBtn
          type="button"
          disabled={isFetching}
          onClick={(e) => {
            e.stopPropagation();
            void run(
              fetchKey,
              TauriCommand.GIT_FETCH,
              { repoId: repo.id },
              t("branches.actions.fetched", { repo: repo.name }),
            );
          }}
        >
          {isFetching ? <SpinIcon size={12} /> : <RefreshCw size={12} />}
          {isFetching ? t("branches.actions.fetching") : t("branches.actions.fetch")}
        </FetchBtn>
      </GroupHead>
      {open && (
        <List>
          {branches.map((b) => (
            <BranchRowItem
              key={(b.isRemote ? `r:${b.remote}/` : "l:") + b.name}
              repo={repo}
              branch={b}
              busyKey={busyKey}
              run={run}
              t={t}
            />
          ))}
        </List>
      )}
    </GroupCard>
  );
}

interface BranchRowItemProps {
  repo: EnrichedRepo;
  branch: BranchInfo;
  busyKey: string | null;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function BranchRowItem({ repo, branch: b, busyKey, run, t }: BranchRowItemProps) {
  const keyPrefix = `${repo.id}:${b.isRemote ? `${b.remote}/${b.name}` : b.name}`;
  const dotTone: "current" | "clean" | "remote" | "neutral" = b.isCurrent
    ? "current"
    : b.isRemote
      ? "remote"
      : b.clean
        ? "clean"
        : "neutral";
  const checkoutKey = `${keyPrefix}:checkout`;
  const pullKey = `${keyPrefix}:pull`;
  const pushKey = `${keyPrefix}:push`;
  const isCheckoutBusy = busyKey === checkoutKey;
  const isPullBusy = busyKey === pullKey;
  const isPushBusy = busyKey === pushKey;

  return (
    <Row>
      <Dot tone={dotTone} />
      <NameCell>
        <BranchIcon size={13} aria-hidden />
        <span>{b.isRemote ? `${b.remote}/${b.name}` : b.name}</span>
        {b.isCurrent && <Tag tone="current">{t("branches.tag.current")}</Tag>}
        {b.isRemote && <Tag tone="remote">{t("branches.tag.remote")}</Tag>}
        {b.isCurrent && repo.status.dirty && <Tag tone="dirty">{t("branches.tag.dirty")}</Tag>}
        {b.clean && <Tag tone="clean">{t("branches.tag.clean")}</Tag>}
      </NameCell>
      <Meta>
        <MetaLine>
          {b.isRemote
            ? " "
            : b.upstream
              ? t("branches.row.upstream_tracking", { upstream: b.upstream })
              : t("branches.row.no_upstream")}
        </MetaLine>
        <MetaLine>
          {b.lastCommit ? t("branches.last_commit_by", { author: b.lastCommit.author }) : " "}
        </MetaLine>
      </Meta>
      <Tail>
        <Acts data-row-acts>
          {!b.isRemote && b.isCurrent && b.behind > 0 && (
            <RowBtn
              type="button"
              tone="ghost"
              disabled={isPullBusy}
              onClick={() =>
                void run(pullKey, "git_pull", { repoId: repo.id }, t("branches.actions.pull"))
              }
            >
              {t("branches.actions.pull")}
            </RowBtn>
          )}
          {!b.isRemote && b.isCurrent && b.ahead > 0 && (
            <RowBtn
              type="button"
              tone="ghost"
              disabled={isPushBusy}
              onClick={() =>
                void run(pushKey, "git_push", { repoId: repo.id }, t("branches.actions.push"))
              }
            >
              {t("branches.actions.push")}
            </RowBtn>
          )}
          {!b.isRemote && !b.isCurrent && (
            <RowBtn
              type="button"
              tone="primary"
              disabled={isCheckoutBusy}
              data-testid="branch-checkout"
              onClick={() =>
                void run(
                  checkoutKey,
                  TauriCommand.GIT_CHECKOUT,
                  { repoId: repo.id, branch: b.name },
                  t("branches.actions.checkout"),
                )
              }
            >
              <BranchIcon size={10} aria-hidden />
              {t("branches.actions.checkout")}
            </RowBtn>
          )}
          {b.isRemote && b.remote && (
            <RowBtn
              type="button"
              tone="primary"
              disabled={isCheckoutBusy}
              data-testid="branch-checkout-remote"
              onClick={() =>
                void run(
                  checkoutKey,
                  TauriCommand.GIT_CHECKOUT_REMOTE,
                  { repoId: repo.id, remote: b.remote, branch: b.name },
                  t("branches.actions.checkout_remote"),
                )
              }
            >
              <BranchIcon size={10} aria-hidden />
              {t("branches.actions.checkout_remote")}
            </RowBtn>
          )}
        </Acts>
        <Track>
          {b.ahead > 0 && <Trk tone="ahead">↑{b.ahead}</Trk>}
          {b.behind > 0 && <Trk tone="behind">↓{b.behind}</Trk>}
          {b.ahead === 0 && b.behind === 0 && !b.isRemote && <Trk tone="even">even</Trk>}
        </Track>
      </Tail>
    </Row>
  );
}
