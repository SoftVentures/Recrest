import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, InputAdornment, MenuItem, Select, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type SearchHit, TauriCommand } from "@recrest/shared";

import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import SearchResultRow from "@/components/organisms/repos/FindAcrossReposDialog/parts/SearchResultRow";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, revealPathInSystem } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

export interface FindAcrossReposDialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional override to inject a stub invoke for tests/stories. */
  search?: (query: string, repoId?: string) => Promise<SearchHit[]>;
}

const ALL_REPOS = "all";

const Body = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  paddingTop: theme.spacing(0.5),
}));

const Hint = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  paddingLeft: theme.spacing(0.5),
})) as typeof Typography;

const FilterRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

const RepoSelect = styled(Select)(({ theme }) => ({
  height: 30,
  minWidth: 170,
  fontSize: 12,
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.border.hover },
  "& .MuiSelect-select": {
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    minHeight: "0 !important",
  },
}));

const StatusText = styled(Box)(({ theme }) => ({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

const ResultsList = styled(Box)(({ theme }) => ({
  maxHeight: 420,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: theme.palette.surface.interface.background,
}));

const GroupSection = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> for keyboard semantics
const GroupHeader = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  // Sticky so the repo label stays visible while scrolling its hits.
  position: "sticky",
  top: 0,
  zIndex: 1,
  padding: "6px 12px",
  background: theme.palette.surface.interface.backElevation,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  color: theme.palette.text.primary,
  "&:first-of-type": { borderTop: 0 },
  "&:hover, &:focus-visible": {
    outline: "none",
    background: theme.palette.surface.interface.active,
  },
}));

const GroupName = styled(Box)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})) as typeof Box;

const GroupCount = styled(Box)(({ theme }) => ({
  marginLeft: "auto",
  flexShrink: 0,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
  background: theme.palette.surface.interface.background,
  borderRadius: 999,
  padding: "1px 8px",
})) as typeof Box;

const Empty = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Box;

const MIN_QUERY = 2;
// Wait for a clear typing pause before searching. Each match runs an
// in-process walk over the tracked repos, so firing on near-every keystroke
// (a short debounce) burns CPU/IO for queries the user is still typing. ~700ms
// is long enough that only a deliberate pause triggers the search.
const DEBOUNCE_MS = 700;

/**
 * Cross-repository content search. The debounced query runs `find_across_repos`
 * (an in-process, .gitignore-aware walk) and lists the hits grouped by repo,
 * with a repo filter that scopes the walk to a single repo. Clicking a row
 * opens the file at its line in the user's IDE, falling back to revealing it in
 * the OS file browser when no IDE is available.
 */
function FindAcrossReposDialog({ open, onClose, search }: FindAcrossReposDialogProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const repoItems = useAppSelector((s) => s.repos.items);
  const repoList = useMemo(() => Object.values(repoItems), [repoItems]);

  const [query, setQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>(ALL_REPOS);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id so a slow earlier search that resolves after a newer one
  // (or after close) can't clobber the current results.
  const seqRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedRepo(ALL_REPOS);
      setHits([]);
      setSearching(false);
      setCollapsed(new Set());
      seqRef.current++;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [open]);

  const runSearch = useCallback(
    async (q: string, repo: string) => {
      if (q.trim().length < MIN_QUERY) {
        seqRef.current++;
        setHits([]);
        return;
      }
      const repoId = repo === ALL_REPOS ? undefined : repo;
      const seq = ++seqRef.current;
      setSearching(true);
      try {
        const result = search
          ? await search(q.trim(), repoId)
          : await invoke<SearchHit[]>(TauriCommand.FIND_ACROSS_REPOS, { query: q.trim(), repoId });
        if (seqRef.current === seq) setHits(result);
      } catch {
        if (seqRef.current === seq) setHits([]);
      } finally {
        if (seqRef.current === seq) setSearching(false);
      }
    },
    [search],
  );

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query, selectedRepo);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedRepo, open, runSearch]);

  const onOpenHit = useCallback(async (hit: SearchHit) => {
    try {
      await invoke(TauriCommand.OPEN_FILE_IN_IDE, {
        path: hit.absolutePath,
        line: hit.line,
        column: hit.column,
      });
    } catch {
      // No IDE resolved / launch failed — at least reveal the file on disk.
      await revealPathInSystem(hit.absolutePath);
    }
  }, []);

  const toggleGroup = useCallback((repoId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  }, []);

  // Group hits by repo, preserving the (repo-ordered) backend sequence and each
  // hit's flat index so row test-ids stay stable across the grouping.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { repoId: string; repoName: string; rows: { hit: SearchHit; index: number }[] }
    >();
    hits.forEach((hit, index) => {
      let group = map.get(hit.repoId);
      if (!group) {
        group = { repoId: hit.repoId, repoName: hit.repoName, rows: [] };
        map.set(hit.repoId, group);
      }
      group.rows.push({ hit, index });
    });
    return Array.from(map.values());
  }, [hits]);

  const showResults = query.trim().length >= MIN_QUERY;

  return (
    <GeneralModal
      open={open}
      modalWidth={640}
      customTitle={t("find_across.title")}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.findAcrossDialog.root}
      contentChildren={
        <Body>
          <TextField
            autoFocus
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("find_across.placeholder")}
            slotProps={{
              htmlInput: { "data-testid": TEST_IDS.findAcrossDialog.input },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <GeneralIconButton
                      icon={<X size={14} />}
                      size={IconButtonSize.XS}
                      aria-label={t("search.clear", { ns: I18nNamespace.ARIA })}
                      data-testid={TEST_IDS.findAcrossDialog.clear}
                      onClick={() => setQuery("")}
                    />
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          {!showResults ? (
            <Hint>{t("find_across.hint")}</Hint>
          ) : (
            <>
              <FilterRow>
                <RepoSelect
                  value={selectedRepo}
                  size="small"
                  onChange={(e) => setSelectedRepo(e.target.value as string)}
                  data-testid={TEST_IDS.findAcrossDialog.repoFilter}
                >
                  <MenuItem value={ALL_REPOS}>{t("find_across.all_repos")}</MenuItem>
                  {repoList.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </RepoSelect>
                <StatusText>
                  {searching ? (
                    <>
                      <GeneralCircularLoader
                        size={CircularLoaderSize.SM}
                        aria-label={t("find_across.searching")}
                      />
                      <Box component="span">{t("find_across.searching")}</Box>
                    </>
                  ) : (
                    <Box component="span">{t("find_across.count", { count: hits.length })}</Box>
                  )}
                </StatusText>
              </FilterRow>

              <ResultsList data-testid={TEST_IDS.findAcrossDialog.list}>
                {hits.length === 0 && !searching ? (
                  <Empty data-testid={TEST_IDS.findAcrossDialog.empty}>
                    {t("find_across.no_results")}
                  </Empty>
                ) : (
                  groups.map((group) => {
                    const isCollapsed = collapsed.has(group.repoId);
                    return (
                      <GroupSection key={group.repoId}>
                        <GroupHeader
                          type="button"
                          onClick={() => toggleGroup(group.repoId)}
                          aria-expanded={!isCollapsed}
                          data-testid={TEST_IDS.findAcrossDialog.group(group.repoId)}
                        >
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          <GroupName component="span">{group.repoName}</GroupName>
                          <GroupCount component="span">{group.rows.length}</GroupCount>
                        </GroupHeader>
                        {!isCollapsed &&
                          group.rows.map(({ hit, index }) => (
                            <SearchResultRow
                              key={`${hit.repoId}-${hit.path}-${hit.line}-${index}`}
                              hit={hit}
                              query={query}
                              onOpen={onOpenHit}
                              ariaLabel={t("find_across.result_aria", {
                                repo: hit.repoName,
                                path: hit.path,
                                line: hit.line,
                              })}
                              testId={TEST_IDS.findAcrossDialog.row(`${index}`)}
                            />
                          ))}
                      </GroupSection>
                    );
                  })
                )}
              </ResultsList>
            </>
          )}
        </Body>
      }
    />
  );
}

export default FindAcrossReposDialog;
