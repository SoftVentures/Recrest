import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { X as ClearIcon, Search as SearchIcon } from "lucide-react";

import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import { type SearchResult, useSearchResults } from "@/hooks/useSearch";
import { setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Backdrop = styled(Box)({
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "10vh",
  background: "rgba(10, 11, 15, 0.45)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
});

const Panel = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: 560,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
  overflow: "hidden",
  color: theme.palette.text.primary,
}));

const Head = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
}));

const Input = styled("input")(({ theme }) => ({
  flex: 1,
  height: 46,
  background: "transparent",
  border: 0,
  outline: "none",
  color: theme.palette.text.primary,
  fontSize: 13.5,
  fontFamily: "inherit",
  "&::placeholder": { color: theme.palette.text.information },
}));

const Kbds = styled(Box)({
  display: "inline-flex",
  gap: 4,
});

const ClearBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  cursor: "pointer",
  borderRadius: "50%",
  padding: 0,
  marginRight: 2,
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const Kbd = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 18,
  padding: "0 5px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.secondary,
  fontSize: 10,
  fontWeight: 600,
}));

const ResultsList = styled("ul")({
  maxHeight: "60vh",
  overflowY: "auto",
  padding: 6,
  margin: 0,
  listStyle: "none",
});

const GroupLabel = styled("li")(({ theme }) => ({
  padding: "8px 10px 4px",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: theme.palette.text.information,
}));

const Divider = styled("li")(({ theme }) => ({
  height: 1,
  backgroundColor: theme.palette.divider,
  margin: "6px 4px",
  listStyle: "none",
}));

const Row = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 10px",
  backgroundColor: active
    ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
    : "transparent",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  color: active ? theme.palette.primary.dark : theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 13,
  textAlign: "left",
  "& .row-icon, & .row-hint": {
    color: active ? theme.palette.primary.dark : theme.palette.text.information,
  },
  "& .row-hint": {
    opacity: active ? 0.7 : 1,
  },
}));

const RowIcon = styled("span")({
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const RowLabel = styled("span")({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 500,
});

const RowHint = styled("span")({
  fontSize: 11.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "52%",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
});

const Empty = styled("li")(({ theme }) => ({
  padding: "28px 12px",
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
  listStyle: "none",
}));

function SearchOverlay() {
  const { t } = useTranslation();
  const open = useAppSelector((s) => s.ui.searchOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const results = useSearchResults(query, options);

  const navResults = useMemo(() => results.filter((r) => r.kind === "nav"), [results]);
  const repoResults = useMemo(() => results.filter((r) => r.kind === "repo"), [results]);
  const mrResults = useMemo(() => results.filter((r) => r.kind === "mr"), [results]);
  const branchResults = useMemo(() => results.filter((r) => r.kind === "branch"), [results]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1));
  }, [cursor, results.length]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const isOpen = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isOpen) {
        e.preventDefault();
        dispatch(setSearchOpen(true));
      }
      if (e.key === "Escape") {
        dispatch(setSearchOpen(false));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[cursor]?.onSelect();
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursor(results.length - 1);
    }
  };

  const renderRow = (r: SearchResult, globalIndex: number) => {
    const Icon = r.icon;
    return (
      <li
        key={r.id}
        id={`search-result-${r.id}`}
        role="option"
        aria-selected={globalIndex === cursor}
      >
        <Row
          type="button"
          active={globalIndex === cursor}
          onMouseEnter={() => setCursor(globalIndex)}
          onClick={r.onSelect}
          data-testid={`search-row-${r.kind}`}
        >
          {r.kind === "repo" && r.repo ? (
            <GeneralRepoAvatar repo={r.repo} size={22} radius={5} />
          ) : (
            <RowIcon className="row-icon">{Icon ? <Icon size={13} /> : null}</RowIcon>
          )}
          <RowLabel>{r.label}</RowLabel>
          <RowHint className="row-hint">{r.hint}</RowHint>
        </Row>
      </li>
    );
  };

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-label={t("actions.search")}
      data-testid="search-overlay"
      onClick={close}
      onKeyDown={onKeyDown}
    >
      <Panel data-testid="search-panel" onClick={(e) => e.stopPropagation()}>
        <Head>
          <SearchIcon size={14} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder={t("actions.search_placeholder", "Search repositories, branches, MRs…")}
            data-testid="search-overlay-input"
            aria-activedescendant={
              results[cursor] ? `search-result-${results[cursor]!.id}` : undefined
            }
          />
          {query && (
            <ClearBtn
              type="button"
              aria-label={t("common.clear_search", { defaultValue: "Clear search" })}
              data-testid="search-overlay-clear"
              onClick={() => {
                setQuery("");
                setCursor(0);
                inputRef.current?.focus();
              }}
            >
              <ClearIcon size={13} aria-hidden />
            </ClearBtn>
          )}
          <Kbds>
            <Kbd>⌘K</Kbd>
            <Kbd>Esc</Kbd>
          </Kbds>
        </Head>
        <ResultsList role="listbox">
          {results.length === 0 ? (
            <Empty>{t("states.empty", "No matches")}</Empty>
          ) : (
            <>
              {navResults.length > 0 && (
                <>
                  <GroupLabel>{t("actions.search_group_nav", "Go to")}</GroupLabel>
                  {navResults.map((r, i) => renderRow(r, i))}
                </>
              )}
              {navResults.length > 0 && repoResults.length > 0 && <Divider aria-hidden />}
              {repoResults.length > 0 && (
                <>
                  <GroupLabel>{t("actions.search_group_repos", "Repositories")}</GroupLabel>
                  {repoResults.map((r, i) => renderRow(r, navResults.length + i))}
                </>
              )}
              {mrResults.length > 0 && (
                <>
                  <Divider aria-hidden />
                  <GroupLabel>{t("actions.search_group_mrs", "Merge requests")}</GroupLabel>
                  {mrResults.map((r, i) =>
                    renderRow(r, navResults.length + repoResults.length + i),
                  )}
                </>
              )}
              {branchResults.length > 0 && (
                <>
                  <Divider aria-hidden />
                  <GroupLabel>{t("actions.search_group_branches", "Branches")}</GroupLabel>
                  {branchResults.map((r, i) =>
                    renderRow(r, navResults.length + repoResults.length + mrResults.length + i),
                  )}
                </>
              )}
            </>
          )}
        </ResultsList>
      </Panel>
    </Backdrop>
  );
}

export default SearchOverlay;
