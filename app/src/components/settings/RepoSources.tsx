import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { scanForRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";

export function RepoSources() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [draft, setDraft] = useState("");

  const addPath = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...scanPaths, trimmed]));
    await dispatch(saveSettings({ scanPaths: next })).unwrap();
    setDraft("");
    void dispatch(scanForRepos(next));
  };

  const removePath = async (path: string) => {
    const next = scanPaths.filter((p) => p !== path);
    await dispatch(saveSettings({ scanPaths: next })).unwrap();
    void dispatch(scanForRepos(next));
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{t("sections.sources")}</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("sources.placeholder")}
          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void addPath()}
          disabled={!draft.trim()}
          className="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("actions.add", { ns: "common" })}
        </button>
      </div>
      {scanPaths.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("sources.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {scanPaths.map((path) => (
            <li key={path} className="flex items-center gap-2 p-2 text-sm">
              <span className="flex-1 truncate font-mono text-xs">{path}</span>
              <button
                type="button"
                onClick={() => void removePath(path)}
                aria-label={t("actions.remove", { ns: "common" })}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
