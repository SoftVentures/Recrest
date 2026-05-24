import { useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PrState } from "@recrest/shared";
import type { PullRequest } from "@recrest/shared";

import { ChevronDown, Filter } from "lucide-react";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import { useDrawerSwipe } from "@/hooks/useDrawerSwipe";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MrRow } from "@/pages/app/MergeRequests/components/MrRow";
import { useAppSelector } from "@/store/hooks";

interface Row {
  pr: PullRequest;
  repoId: string;
  repoName: string;
}

const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  // Toolbar drops in — matches src-old `.p-mrs .a-mr-toolbar`.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
});

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const FilterBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

const Card = styled(Box)(({ theme }) => ({
  // Right margin compensates for the parent Scroll's 4px scrollbar gutter.
  margin: theme.spacing(0, 1.5, 0, 2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.surface.interface.base,
  overflow: "hidden",
}));

const Scroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
  paddingBottom: 24,
});

export default function MergeRequestsPage() {
  const { t } = useTranslation();
  const items = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const connections = useAppSelector((s) => s.providers.connections);
  const [filter, setFilter] = useState("");

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const [repoId, prs] of Object.entries(items)) {
      const repo = repos[repoId];
      if (!repo || !repo.providerId) continue;
      if (!connections[repo.providerId]?.connected) continue;
      for (const pr of prs) {
        if (pr.state !== PrState.OPEN) continue;
        out.push({ pr, repoId, repoName: repo.name });
      }
    }
    if (!filter.trim()) return out;
    const q = filter.toLowerCase();
    return out.filter(
      (r) =>
        r.pr.title.toLowerCase().includes(q) ||
        r.repoName.toLowerCase().includes(q) ||
        r.pr.author.toLowerCase().includes(q),
    );
  }, [items, repos, connections, filter]);

  const [selected, setSelected] = useState<Row | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  useDrawerSwipe({
    ref: drawerRef,
    enabled: !!selected,
    onClose: () => setSelected(null),
    direction: "right",
  });

  return (
    <Root data-testid={TEST_IDS.mr.page}>
      <Toolbar>
        <GeneralSearchInput
          value={filter}
          onChange={setFilter}
          placeholder={t("mrs.filter_placeholder")}
          aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
          clearLabel={t("search.clear", { ns: I18nNamespace.ARIA })}
          data-testid={TEST_IDS.mr.filterInput}
          clearTestId={TEST_IDS.mr.filterClear}
        />
        <FilterBtn type="button" data-testid={TEST_IDS.mr.filterBtn}>
          <Filter size={13} />
          {t("mrs.filters")}
          <ChevronDown size={13} />
        </FilterBtn>
      </Toolbar>

      <Scroll>
        {rows.length === 0 ? (
          <EmptyState
            mascot="snoozing"
            title="No open merge requests"
            description="Connected providers haven't returned any open PRs yet."
          />
        ) : (
          <Card>
            {rows.map((row) => (
              <MrRow
                key={`${row.repoId}#${row.pr.number}`}
                pr={row.pr}
                repoName={row.repoName}
                onClick={() => setSelected(row)}
              />
            ))}
          </Card>
        )}
      </Scroll>

      <MrDetailDrawer
        pr={selected?.pr ?? null}
        repoId={selected?.repoId ?? ""}
        repoName={selected?.repoName}
        bodyRef={drawerRef}
        onClose={() => setSelected(null)}
      />
    </Root>
  );
}
