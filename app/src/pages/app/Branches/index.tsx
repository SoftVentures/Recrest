import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Divider, ListItemText, Menu, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand } from "@recrest/shared";

import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Filter,
  Laptop,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import { useBranchesByRepo } from "@/hooks/useBranchesByRepo";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { LocationFlag, TrackingFlag } from "@/lib/constants/branchesFilter.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke } from "@/lib/tauri";
import {
  matchLocationFilter,
  matchSearchFilter,
  matchTrackingFilter,
} from "@/lib/utils/branchFilters.utils";
import PopoverChip from "@/pages/app/Branches/parts/PopoverChip";
import RepoGroup from "@/pages/app/Branches/parts/RepoGroup";
import {
  type BranchesByRepo,
  Empty,
  FilterItem,
  SectionLabel,
  SpinIcon,
} from "@/pages/app/Branches/parts/_shared";
import { loadRepos } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

const Root = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
}) as typeof Box;

const Page = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  scrollbarGutter: "stable",
  padding: "18px 22px 80px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
}) as typeof Box;

const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "4px 0",
  flexWrap: "wrap",
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
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
  marginLeft: "auto",
});

const FilterBadge = styled(Typography)(({ theme }) => ({
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
})) as typeof Typography;

const Groups = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 14,
}) as typeof Box;

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
    const q = search.trim().toLowerCase();
    return byRepoAll
      .map(({ repo, branches }) => ({
        repo,
        branches: branches.filter(
          (b) =>
            matchTrackingFilter(b, tracking) &&
            matchLocationFilter(b, location) &&
            matchSearchFilter(b, q),
        ),
      }))
      .filter(({ branches }) => branches.length > 0);
  }, [byRepoAll, tracking, location, search]);

  const activeFilterCount = (tracking ? 1 : 0) + (location ? 1 : 0);
  const fetchAllKey = "__all__:fetch";
  const fetchAllBusy = busyKey === fetchAllKey;

  return (
    <Root data-testid={TEST_IDS.branches.page}>
      <Page>
        <Toolbar>
          <GeneralSearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("branches.search_placeholder")}
            aria-label={t("branches.search_aria")}
            clearLabel={t("actions.clear_search")}
            width={240}
            height={32}
            data-testid={TEST_IDS.branches.search}
            clearTestId={TEST_IDS.branches.searchClear}
          />
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
            data-testid={TEST_IDS.branches.fetchAll}
          >
            {fetchAllBusy ? <SpinIcon size={12} /> : <RefreshCw size={12} />}
            {fetchAllBusy ? t("branches.actions.fetching") : t("branches.actions.fetch_all")}
          </FetchAllBtn>
          <ToolbarBtn
            type="button"
            data-testid={TEST_IDS.branches.filterTrigger}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            active={activeFilterCount > 0}
          >
            <Filter size={14} aria-hidden />
            {t("branches.filter.button")}
            {activeFilterCount > 0 && (
              <FilterBadge component="span" variant="caption">
                {activeFilterCount}
              </FilterBadge>
            )}
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
            <SectionLabel>{t("branches.filter.tracking_label")}</SectionLabel>
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
              active={tracking === TrackingFlag.AHEAD}
              onSelect={() => setTracking(TrackingFlag.AHEAD)}
            />
            <PopoverChip
              icon={<ArrowDownFromLine size={14} />}
              label={t("branches.filter.behind")}
              count={totals.behind}
              active={tracking === TrackingFlag.BEHIND}
              onSelect={() => setTracking(TrackingFlag.BEHIND)}
            />
            <PopoverChip
              icon={<CheckCircle2 size={14} />}
              label={t("branches.filter.clean")}
              count={totals.clean}
              active={tracking === TrackingFlag.CLEAN}
              onSelect={() => setTracking(TrackingFlag.CLEAN)}
            />
            <Divider sx={{ my: 0.5 }} />
            <SectionLabel>{t("branches.filter.location_label")}</SectionLabel>
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
              active={location === LocationFlag.LOCAL}
              onSelect={() => setLocation(LocationFlag.LOCAL)}
            />
            <PopoverChip
              icon={<Cloud size={14} />}
              label={t("branches.filter.remote")}
              count={totals.remote}
              active={location === LocationFlag.REMOTE}
              onSelect={() => setLocation(LocationFlag.REMOTE)}
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
                  <ListItemText primary={t("branches.filter.reset")} />
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
