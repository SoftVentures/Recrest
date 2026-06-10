import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { X as ClearIcon, Search as SearchIcon } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralIconButton, {
  IconButtonShape,
  IconButtonSize,
} from "@/components/atoms/buttons/GeneralIconButton";
import {
  Backdrop,
  Divider,
  Empty,
  GroupLabel,
  Head,
  Input,
  Kbd,
  Kbds,
  Panel,
  ResultsList,
  Row,
  RowHint,
  RowIcon,
  RowLabel,
} from "@/components/organisms/OverallSearch/OverallSearch.styles";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { type SearchResult, useSearchResults } from "@/hooks/useSearch";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { SearchKind } from "@/lib/constants/searchKinds.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function OverallSearch() {
  const { t } = useTranslation();
  const platform = usePlatform();
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

  const navResults = useMemo(() => results.filter((r) => r.kind === SearchKind.NAV), [results]);
  const repoResults = useMemo(() => results.filter((r) => r.kind === SearchKind.REPO), [results]);
  const mrResults = useMemo(() => results.filter((r) => r.kind === SearchKind.MR), [results]);
  const branchResults = useMemo(
    () => results.filter((r) => r.kind === SearchKind.BRANCH),
    [results],
  );

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
      if (e.key === KEYBOARD_KEYS.ESCAPE) {
        dispatch(setSearchOpen(false));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === KEYBOARD_KEYS.ARROW_DOWN) {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === KEYBOARD_KEYS.ARROW_UP) {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === KEYBOARD_KEYS.ENTER) {
      e.preventDefault();
      results[cursor]?.onSelect();
    } else if (e.key === KEYBOARD_KEYS.HOME) {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === KEYBOARD_KEYS.END) {
      e.preventDefault();
      setCursor(results.length - 1);
    }
  };

  const renderRow = (r: SearchResult, globalIndex: number) => {
    const Icon = r.icon;
    return (
      <Box
        component="li"
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
          data-testid={TEST_IDS.searchOverlay.row(r.kind)}
        >
          {r.kind === SearchKind.REPO && r.repo ? (
            <RepoAvatar repo={r.repo} size={22} radius={5} />
          ) : (
            <RowIcon component="span" className="row-icon">
              {Icon ? <Icon size={13} /> : null}
            </RowIcon>
          )}
          <RowLabel component="span" variant="caption">
            {r.label}
          </RowLabel>
          <RowHint component="span" variant="caption" className="row-hint">
            {r.hint}
          </RowHint>
        </Row>
      </Box>
    );
  };

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
            placeholder={t("actions.search_placeholder")}
            aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
            data-testid={TEST_IDS.searchOverlay.input}
            aria-activedescendant={
              results[cursor] ? `search-result-${results[cursor]!.id}` : undefined
            }
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
            <Kbd>{formatShortcut(platform, { mod: true, key: KEYBOARD_KEYS.K })}</Kbd>
            <Kbd>{KEYBOARD_KEYS.ESCAPE}</Kbd>
          </Kbds>
        </Head>
        <ResultsList component="ul" role="listbox">
          {results.length === 0 ? (
            <Empty component="li">{t("states.empty")}</Empty>
          ) : (
            <>
              {navResults.length > 0 && (
                <>
                  <GroupLabel component="li">{t("actions.search_group_nav")}</GroupLabel>
                  {navResults.map((r, i) => renderRow(r, i))}
                </>
              )}
              {navResults.length > 0 && repoResults.length > 0 && <Divider aria-hidden />}
              {repoResults.length > 0 && (
                <>
                  <GroupLabel component="li">{t("actions.search_group_repos")}</GroupLabel>
                  {repoResults.map((r, i) => renderRow(r, navResults.length + i))}
                </>
              )}
              {mrResults.length > 0 && (
                <>
                  <Divider component="li" aria-hidden />
                  <GroupLabel component="li">{t("actions.search_group_mrs")}</GroupLabel>
                  {mrResults.map((r, i) =>
                    renderRow(r, navResults.length + repoResults.length + i),
                  )}
                </>
              )}
              {branchResults.length > 0 && (
                <>
                  <Divider component="li" aria-hidden />
                  <GroupLabel component="li">{t("actions.search_group_branches")}</GroupLabel>
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

export default OverallSearch;
