import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Divider, Menu, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CiStatus } from "@recrest/shared";

import { Check, CheckCircle2, CircleDashed, Loader, Slash, XCircle } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import FilterMenuItem from "@/components/molecules/filters/FilterMenuItem";
import { SectionLabel } from "@/components/molecules/filters/FilterMenuItem/FilterMenuItem.styles";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  type MrFiltersState,
  cloneMrFilters,
  toggleInSet,
} from "@/pages/app/MergeRequests/utils/mrFilters";

export interface RepoOption {
  id: string;
  name: string;
  count: number;
  /** Auto-detected logo paths from the repo scanner — same fields the
   *  Redux Repository record exposes, so the popover stays a pure prop
   *  consumer instead of reaching into the store. */
  logoPath?: string | null;
  logoDarkPath?: string | null;
}

export interface AuthorOption {
  login: string;
  count: number;
  avatarUrl?: string | null;
}

interface Props {
  open: boolean;
  anchorEl: HTMLElement | null;
  filters: MrFiltersState;
  onChange: (next: MrFiltersState) => void;
  onClose: () => void;
  repos: RepoOption[];
  authors: AuthorOption[];
  hasDrafts: boolean;
}

const CI_ORDER: CiStatus[] = [
  CiStatus.SUCCESS,
  CiStatus.FAILURE,
  CiStatus.RUNNING,
  CiStatus.PENDING,
  CiStatus.NONE,
];

const CI_ICONS: Record<CiStatus, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle2,
  failure: XCircle,
  running: Loader,
  pending: CircleDashed,
  none: Slash,
};

export default function MrFiltersPopover({
  open,
  anchorEl,
  filters,
  onChange,
  onClose,
  repos,
  authors,
  hasDrafts,
}: Props) {
  const { t } = useTranslation();

  const isDirty = useMemo(
    () =>
      filters.repoIds.size > 0 ||
      filters.authors.size > 0 ||
      filters.ciStatuses.size > 0 ||
      !filters.includeDrafts,
    [filters],
  );

  const update = (mutator: (draft: MrFiltersState) => void) => {
    const draft = cloneMrFilters(filters);
    mutator(draft);
    onChange(draft);
  };

  const reset = () =>
    onChange({
      repoIds: new Set(),
      authors: new Set(),
      ciStatuses: new Set(),
      includeDrafts: true,
    });

  return (
    <FilterMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: { "data-testid": TEST_IDS.mr.filterPopover } as React.HTMLAttributes<HTMLElement>,
      }}
    >
      <HeaderRow>
        <HeaderTitle component="span">{t("mrs.filter_panel.title")}</HeaderTitle>
        <ResetBtn
          type="button"
          onClick={reset}
          disabled={!isDirty}
          data-testid={TEST_IDS.mr.filterReset}
        >
          {t("mrs.filter_panel.reset")}
        </ResetBtn>
      </HeaderRow>

      <SectionLabel>{t("mrs.filter_panel.section_repos")}</SectionLabel>
      {repos.length === 0 ? (
        <EmptyHint>{t("mrs.filter_panel.empty_section")}</EmptyHint>
      ) : (
        repos.map((r) => {
          const checked = filters.repoIds.has(r.id);
          return (
            <FilterMenuItem
              key={r.id}
              label={r.name}
              count={r.count}
              active={checked}
              avatar={
                <RepoAvatar
                  repo={{
                    id: r.id,
                    name: r.name,
                    logoPath: r.logoPath ?? null,
                    logoDarkPath: r.logoDarkPath ?? null,
                  }}
                  size={18}
                />
              }
              onSelect={() =>
                update((d) => {
                  d.repoIds = toggleInSet(d.repoIds, r.id);
                })
              }
              data-testid={TEST_IDS.mr.filterRepoOption(r.id)}
              aria-pressed={checked}
            />
          );
        })
      )}

      <MenuSeparator />
      <SectionLabel>{t("mrs.filter_panel.section_authors")}</SectionLabel>
      {authors.length === 0 ? (
        <EmptyHint>{t("mrs.filter_panel.empty_section")}</EmptyHint>
      ) : (
        authors.map((a) => {
          const checked = filters.authors.has(a.login);
          return (
            <FilterMenuItem
              key={a.login}
              label={a.login}
              count={a.count}
              active={checked}
              avatar={<AuthorAvatar name={a.login} avatarUrl={a.avatarUrl ?? null} size={18} />}
              onSelect={() =>
                update((d) => {
                  d.authors = toggleInSet(d.authors, a.login);
                })
              }
              data-testid={TEST_IDS.mr.filterAuthorOption(a.login)}
              aria-pressed={checked}
            />
          );
        })
      )}

      {hasDrafts && (
        <>
          <MenuSeparator />
          <SectionLabel>{t("mrs.filter_panel.section_status")}</SectionLabel>
          <FilterMenuItem
            label={t("mrs.filter_panel.include_drafts")}
            active={filters.includeDrafts}
            icon={<Check size={14} />}
            onSelect={() =>
              update((d) => {
                d.includeDrafts = !d.includeDrafts;
              })
            }
            data-testid={TEST_IDS.mr.filterDraftToggle}
            aria-pressed={filters.includeDrafts}
          />
        </>
      )}

      <MenuSeparator />
      <SectionLabel>{t("mrs.filter_panel.section_ci")}</SectionLabel>
      {CI_ORDER.map((status) => {
        const checked = filters.ciStatuses.has(status);
        const Icon = CI_ICONS[status];
        return (
          <FilterMenuItem
            key={status}
            label={t(`mrs.filter_panel.ci.${status}`)}
            active={checked}
            icon={<Icon size={14} />}
            onSelect={() =>
              update((d) => {
                d.ciStatuses = toggleInSet(d.ciStatuses, status);
              })
            }
            data-testid={TEST_IDS.mr.filterCiOption(status)}
            aria-pressed={checked}
          />
        );
      })}
    </FilterMenu>
  );
}

const FilterMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    minWidth: 260,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    paddingTop: 4,
    paddingBottom: 4,
  },
}));

const HeaderRow = styled(MenuItem)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  padding: "6px 12px 6px",
  background: "transparent",
  cursor: "default",
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: 4,
  "&:hover": { background: "transparent" },
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button>: ghost inline reset affordance inside the menu header, must stay keyboard-focusable separately from the MenuItem
const ResetBtn = styled("button")(({ theme }) => ({
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 4,
  "&:hover": { color: theme.palette.text.primary },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
  "&:disabled": {
    color: theme.palette.text.disabled,
    cursor: "default",
  },
}));

const MenuSeparator = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(0.5, 1),
  borderColor: theme.palette.divider,
}));

const EmptyHint = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  padding: "4px 12px 8px",
})) as typeof Typography;
