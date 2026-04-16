import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { ArrowRight, Folder, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSearchResults } from "@/hooks/useSearch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchOpen } from "@/store/slices/uiSlice";

export function SearchOverlay() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const open = useAppSelector((s) => s.ui.searchOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const options = useMemo(
    () => ({
      navigate: (path: string) => navigate(path),
      labels: {
        repos: t("nav.repos"),
        prs: t("nav.prs"),
        settings: t("nav.settings"),
      },
    }),
    [navigate, t],
  );

  const results = useSearchResults(query, options);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("actions.search")}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={() => dispatch(setSearchOpen(false))}
      onKeyDown={onKeyDown}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder={t("actions.search")}
            className="h-11 flex-1 bg-transparent text-sm outline-none"
            aria-activedescendant={
              results[cursor] ? `search-result-${results[cursor].id}` : undefined
            }
          />
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              {t("states.empty")}
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.id}
                id={`search-result-${r.id}`}
                role="option"
                aria-selected={i === cursor}
              >
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={r.onSelect}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === cursor ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  {r.kind === "nav" ? (
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="flex-1 truncate">{r.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{r.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
