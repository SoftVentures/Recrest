import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, InputAdornment, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type SearchHit, TauriCommand } from "@recrest/shared";

import { Search, X } from "lucide-react";

import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke } from "@/lib/tauri";
import { openExternal } from "@/lib/tauri";

export interface FindAcrossReposDialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional override to inject a stub invoke for tests/stories. */
  search?: (query: string) => Promise<SearchHit[]>;
}

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

const ResultsList = styled(Box)(({ theme }) => ({
  maxHeight: 420,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: theme.palette.surface.interface.background,
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> for keyboard semantics
const ResultRow = styled("button")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 2,
  padding: "8px 12px",
  background: "transparent",
  border: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:last-child": { borderBottom: 0 },
  "&:hover, &:focus-visible": {
    outline: "none",
    background: theme.palette.surface.interface.active,
  },
}));

const ResultHead = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  fontSize: 11,
}) as typeof Box;

const RepoName = styled(Box)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Box;

const Locator = styled(Box)(({ theme }) => ({
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
})) as typeof Box;

const Snippet = styled(Box)(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  color: theme.palette.text.secondary,
  whiteSpace: "pre",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

const Empty = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Box;

const MIN_QUERY = 2;

/**
 * Cross-repository content search. Runs `find_across_repos` against every
 * tracked repo and shows the resulting hits with file + line locators. The
 * Rust side decides what to grep over and how to truncate — the dialog just
 * renders the result list and forwards row clicks to the IDE / file browser.
 */
function FindAcrossReposDialog({ open, onClose, search }: FindAcrossReposDialogProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [open]);

  const runSearch = useMemo(() => {
    return async (q: string) => {
      if (q.trim().length < MIN_QUERY) {
        setHits([]);
        return;
      }
      setSearching(true);
      try {
        const result = search
          ? await search(q.trim())
          : await invoke<SearchHit[]>(TauriCommand.FIND_ACROSS_REPOS, { query: q.trim() });
        setHits(result);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    };
  }, [search]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, runSearch]);

  const onRowClick = (hit: SearchHit) => {
    // Best-effort: hand off to the OS so the user's editor (typically VS Code
    // via `vscode://file/...`) gets a chance to open the file. We rely on the
    // existing `openExternal` plumbing rather than introducing a new IPC.
    const url = `file:///${hit.path.replace(/^\//, "")}`;
    void openExternal(url);
  };

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
                      aria-label="Clear"
                      data-testid={TEST_IDS.findAcrossDialog.clear}
                      onClick={() => setQuery("")}
                    />
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Hint>{t("find_across.hint")}</Hint>
          {query.trim().length >= MIN_QUERY && (
            <ResultsList data-testid={TEST_IDS.findAcrossDialog.list}>
              {hits.length === 0 && !searching ? (
                <Empty data-testid={TEST_IDS.findAcrossDialog.empty}>
                  {t("find_across.no_results")}
                </Empty>
              ) : (
                hits.map((hit, idx) => {
                  const rowKey = `${hit.repoId}-${hit.path}-${hit.line}-${idx}`;
                  return (
                    <ResultRow
                      key={rowKey}
                      type="button"
                      onClick={() => onRowClick(hit)}
                      aria-label={t("find_across.result_aria", {
                        repo: hit.repoName,
                        path: hit.path,
                        line: hit.line,
                      })}
                      data-testid={TEST_IDS.findAcrossDialog.row(`${idx}`)}
                    >
                      <ResultHead>
                        <RepoName component="span">{hit.repoName}</RepoName>
                        <Locator component="span">
                          {hit.path}:{hit.line}
                        </Locator>
                      </ResultHead>
                      <Snippet component="span">{hit.snippet}</Snippet>
                    </ResultRow>
                  );
                })
              )}
            </ResultsList>
          )}
        </Body>
      }
    />
  );
}

export default FindAcrossReposDialog;
