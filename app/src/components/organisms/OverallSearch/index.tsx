import {
  type ComponentType,
  Fragment,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { type Repository, type SearchHit, TauriCommand } from "@recrest/shared";

import { X as ClearIcon, type LucideProps, Search as SearchIcon } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralIconButton, {
  IconButtonShape,
  IconButtonSize,
} from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import {
  Backdrop,
  Divider,
  Empty,
  GroupLabel,
  Head,
  Hint,
  Input,
  Kbd,
  Kbds,
  Panel,
  ResultsList,
  Row,
  RowHint,
  RowIcon,
  RowLabel,
  ScopeRow,
  StatusText,
  TabBar,
  TabButton,
} from "@/components/organisms/OverallSearch/OverallSearch.styles";
import ContentHitRow from "@/components/organisms/OverallSearch/parts/ContentHitRow";
import RepoScopeSelect from "@/components/organisms/OverallSearch/parts/RepoScopeSelect";
import { useContentSearch } from "@/hooks/useContentSearch";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { type SearchResult, useSearchResults } from "@/hooks/useSearch";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { SearchKind, SearchTab } from "@/lib/constants/searchKinds.constants";
import { SHORTCUT_ID } from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, revealPathInSystem } from "@/lib/tauri";
import { resolveShortcuts } from "@/lib/utils/shortcuts.utils";
import { setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/** A normalized, navigable palette row — either a quick-switch result (Global
 *  tab) or a file content hit (Content tab) — so cursor/Enter handling is
 *  uniform across both. `snippet` marks a content hit so it renders the
 *  two-line variant. */
interface RenderEntry {
  key: string;
  testId: string;
  icon?: ComponentType<LucideProps>;
  repo?: Repository;
  label: string;
  hint?: string;
  snippet?: string;
  line?: number;
  onSelect: () => void;
}

interface PaletteSection {
  id: string;
  label: string;
  testId?: string;
  entries: RenderEntry[];
}

function OverallSearch() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const open = useAppSelector((s) => s.ui.searchOpen);
  const activeRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const overrides = useAppSelector((s) => s.shortcuts.overrides);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const repos = useEnrichedRepos();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>(SearchTab.GLOBAL);
  // Content-tab repo filter: a repo id, or undefined for "all repositories".
  const [scopeRepoId, setScopeRepoId] = useState<string | undefined>(undefined);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Read at open time without making the reset effect re-fire when the selected
  // repo changes underneath an open palette.
  const activeRepoIdRef = useRef(activeRepoId);
  activeRepoIdRef.current = activeRepoId;

  // Footer hint mirrors the real ⌘K binding — including any user override — so
  // it can never drift from what `useGlobalShortcuts` actually listens for.
  const searchCombo = useMemo(
    () => resolveShortcuts(overrides).find((s) => s.id === SHORTCUT_ID.SEARCH)?.combo,
    [overrides],
  );
  const searchHint = searchCombo
    ? formatShortcut(platform, { ...searchCombo, key: searchCombo.key.toUpperCase() })
    : "";

  const close = useCallback(() => {
    dispatch(setSearchOpen(false));
    setQuery("");
  }, [dispatch]);

  const options = useMemo(
    () => ({
      navigate: (path: string) => navigate(path),
      labels: {
        dashboard: t("nav.dashboard"),
        repos: t("nav.repos"),
        merge_requests: t("nav.merge_requests"),
        changes: t("nav.changes"),
        branches: t("nav.branches"),
        activity: t("nav.activity"),
        settings: t("nav.settings"),
      },
    }),
    [navigate, t],
  );

  const contentMode = tab === SearchTab.REPO;
  const results = useSearchResults(query, options);
  const { hits: contentHits, searching } = useContentSearch(
    query,
    scopeRepoId,
    open && contentMode,
  );

  const openFile = useCallback(
    async (hit: SearchHit) => {
      dispatch(setSearchOpen(false));
      try {
        await invoke(TauriCommand.OPEN_FILE_IN_IDE, {
          path: hit.absolutePath,
          line: hit.line,
          column: hit.column,
        });
      } catch {
        await revealPathInSystem(hit.absolutePath);
      }
    },
    [dispatch],
  );

  const resultEntry = useCallback(
    (r: SearchResult): RenderEntry => ({
      key: r.id,
      testId: TEST_IDS.searchOverlay.row(r.kind),
      icon: r.icon,
      repo: r.kind === SearchKind.REPO ? r.repo : undefined,
      label: r.label,
      hint: r.hint,
      onSelect: r.onSelect,
    }),
    [],
  );

  const sections = useMemo<PaletteSection[]>(() => {
    if (contentMode) {
      // Group file-content hits by repo, preserving the backend's order. Each
      // group is a repo header + its hit rows; a single-repo scope yields one
      // group.
      const groups = new Map<string, { repoName: string; entries: RenderEntry[] }>();
      contentHits.forEach((hit, i) => {
        let group = groups.get(hit.repoId);
        if (!group) {
          group = { repoName: hit.repoName, entries: [] };
          groups.set(hit.repoId, group);
        }
        group.entries.push({
          key: `content:${hit.repoId}:${hit.path}:${hit.line}:${i}`,
          testId: TEST_IDS.searchOverlay.contentRow(String(i)),
          label: hit.path,
          line: hit.line,
          snippet: hit.snippet,
          onSelect: () => void openFile(hit),
        });
      });
      return Array.from(groups.entries()).map(([repoId, group]) => ({
        id: `content:${repoId}`,
        label: group.repoName,
        testId: TEST_IDS.searchOverlay.contentGroup(repoId),
        entries: group.entries,
      }));
    }
    const byKind = (kind: SearchKind, label: string): PaletteSection => ({
      id: kind,
      label,
      entries: results.filter((r) => r.kind === kind).map(resultEntry),
    });
    return [
      byKind(SearchKind.NAV, t("actions.search_group_nav")),
      byKind(SearchKind.REPO, t("actions.search_group_repos")),
      byKind(SearchKind.MR, t("actions.search_group_mrs")),
      byKind(SearchKind.BRANCH, t("actions.search_group_branches")),
    ].filter((s) => s.entries.length > 0);
  }, [contentMode, contentHits, results, resultEntry, openFile, t]);

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTab(SearchTab.GLOBAL);
      // Pre-select the repo you came from so the content tab searches it first;
      // the filter still offers "all repositories".
      setScopeRepoId(activeRepoIdRef.current ?? undefined);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (cursor >= flat.length) setCursor(Math.max(0, flat.length - 1));
  }, [cursor, flat.length]);

  // ⌘K/Ctrl+K (open) is bound centrally in useGlobalShortcuts; here we only
  // close on Escape while the palette is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.ESCAPE) dispatch(setSearchOpen(false));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, open]);

  if (!open) return null;

  const switchTab = (next: SearchTab) => {
    setTab(next);
    setCursor(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === KEYBOARD_KEYS.ARROW_DOWN) {
      e.preventDefault();
      setCursor((c) => Math.min(flat.length - 1, c + 1));
    } else if (e.key === KEYBOARD_KEYS.ARROW_UP) {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === KEYBOARD_KEYS.ENTER) {
      e.preventDefault();
      flat[cursor]?.onSelect();
    } else if (e.key === KEYBOARD_KEYS.HOME) {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === KEYBOARD_KEYS.END) {
      e.preventDefault();
      setCursor(flat.length - 1);
    }
  };

  const renderRow = (entry: RenderEntry, globalIndex: number) => {
    const Icon = entry.icon;
    return (
      <Box
        component="li"
        key={entry.key}
        // Index-based id (not the content-derived key) so the IDREF stays valid
        // for content rows whose key holds a path with "/", ".", ":" etc.
        id={`search-result-${globalIndex}`}
        role="option"
        aria-selected={globalIndex === cursor}
      >
        {entry.snippet != null ? (
          <ContentHitRow
            path={entry.label}
            line={entry.line ?? 0}
            snippet={entry.snippet}
            query={query}
            active={globalIndex === cursor}
            testId={entry.testId}
            onMouseEnter={() => setCursor(globalIndex)}
            onClick={entry.onSelect}
          />
        ) : (
          <Row
            type="button"
            active={globalIndex === cursor}
            onMouseEnter={() => setCursor(globalIndex)}
            onClick={entry.onSelect}
            data-testid={entry.testId}
          >
            {entry.repo ? (
              <RepoAvatar repo={entry.repo} size={22} radius={5} />
            ) : (
              <RowIcon component="span" className="row-icon">
                {Icon ? <Icon size={13} /> : null}
              </RowIcon>
            )}
            <RowLabel component="span" variant="caption">
              {entry.label}
            </RowLabel>
            {entry.hint && (
              <RowHint component="span" variant="caption" className="row-hint">
                {entry.hint}
              </RowHint>
            )}
          </Row>
        )}
      </Box>
    );
  };

  const contentTooShort = contentMode && query.trim().length < 2;
  let runningIndex = 0;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-label={t("actions.search")}
      data-testid={TEST_IDS.searchOverlay.root}
      onClick={close}
      onKeyDown={onKeyDown}
    >
      <Panel data-testid={TEST_IDS.searchOverlay.panel} onClick={(e) => e.stopPropagation()}>
        <Head>
          <SearchIcon size={14} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder={t(
              contentMode ? "actions.search_content_placeholder" : "actions.search_placeholder",
            )}
            aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
            data-testid={TEST_IDS.searchOverlay.input}
            aria-activedescendant={flat[cursor] ? `search-result-${cursor}` : undefined}
          />
          {query && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              shape={IconButtonShape.CIRCLE}
              aria-label={t("actions.clear_search")}
              data-testid={TEST_IDS.searchOverlay.clear}
              onClick={() => {
                setQuery("");
                setCursor(0);
                inputRef.current?.focus();
              }}
              icon={<ClearIcon size={13} aria-hidden />}
            />
          )}
          <Kbds>
            <Kbd>{searchHint}</Kbd>
            <Kbd>{KEYBOARD_KEYS.ESCAPE}</Kbd>
          </Kbds>
        </Head>
        <TabBar role="tablist">
          <TabButton
            type="button"
            role="tab"
            active={tab === SearchTab.GLOBAL}
            aria-selected={tab === SearchTab.GLOBAL}
            onClick={() => switchTab(SearchTab.GLOBAL)}
            data-testid={TEST_IDS.searchOverlay.tab(SearchTab.GLOBAL)}
          >
            {t("actions.search_tab_global")}
          </TabButton>
          <TabButton
            type="button"
            role="tab"
            active={tab === SearchTab.REPO}
            aria-selected={tab === SearchTab.REPO}
            onClick={() => switchTab(SearchTab.REPO)}
            data-testid={TEST_IDS.searchOverlay.tab(SearchTab.REPO)}
          >
            {t("actions.search_tab_repo")}
          </TabButton>
        </TabBar>
        {contentMode && (
          <ScopeRow>
            <RepoScopeSelect
              repos={repos}
              value={scopeRepoId}
              allLabel={t("actions.search_scope_all")}
              ariaLabel={t("actions.search_tab_repo")}
              onChange={(id) => {
                setScopeRepoId(id);
                setCursor(0);
              }}
            />
            {query.trim().length >= 2 && (
              <StatusText component="span">
                {searching ? (
                  <>
                    <GeneralCircularLoader
                      size={CircularLoaderSize.SM}
                      aria-label={t("actions.search_content_searching")}
                    />
                    {t("actions.search_content_searching")}
                  </>
                ) : (
                  t("actions.search_content_count", { count: contentHits.length })
                )}
              </StatusText>
            )}
          </ScopeRow>
        )}
        <ResultsList component="ul" role="listbox">
          {contentTooShort ? (
            <Hint component="li" data-testid={TEST_IDS.searchOverlay.contentHint}>
              {t("actions.search_content_hint")}
            </Hint>
          ) : flat.length === 0 ? (
            <Empty
              component="li"
              data-testid={contentMode ? TEST_IDS.searchOverlay.contentEmpty : undefined}
            >
              {t(contentMode ? "actions.search_content_empty" : "states.empty")}
            </Empty>
          ) : (
            sections.map((section, si) => {
              const start = runningIndex;
              runningIndex += section.entries.length;
              return (
                <Fragment key={section.id}>
                  {si > 0 && <Divider component="li" aria-hidden />}
                  <GroupLabel component="li" data-testid={section.testId}>
                    {section.label}
                  </GroupLabel>
                  {section.entries.map((entry, i) => renderRow(entry, start + i))}
                </Fragment>
              );
            })
          )}
        </ResultsList>
      </Panel>
    </Backdrop>
  );
}

export default OverallSearch;
