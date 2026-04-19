import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/icons/Icon";
import { SettingsSection } from "@/components/settings/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { scanForRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";

export function RepoSources() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async (next: string[], toastKey: "added" | "removed") => {
    try {
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
      void dispatch(scanForRepos(next));
      toast.success(t(`sources.${toastKey}`));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  const addPath = async (rawPath?: string) => {
    const candidate = (rawPath ?? draft).trim();
    if (!candidate) return;
    if (scanPaths.includes(candidate)) {
      toast.info(t("sources.duplicate", { defaultValue: "Already in the list." }));
      return;
    }
    setBusy(true);
    try {
      await commit([...scanPaths, candidate], "added");
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const removePath = async (path: string) =>
    commit(
      scanPaths.filter((p) => p !== path),
      "removed",
    );

  const pickDirectory = async () => {
    if (!isTauri()) {
      toast.info(
        t("sources.browse_desktop_only", {
          defaultValue: "Browse works in the desktop app only.",
        }),
      );
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        directory: true,
        multiple: false,
        title: t("sources.browse", { defaultValue: "Browse…" }),
      });
      if (typeof picked === "string" && picked) void addPath(picked);
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  return (
    <SettingsSection title={t("sections.sources")} description={t("sources.description")}>
      <div className="a-set-row a-src-add">
        <div className="a-set-row-l">
          <div className="a-set-row-lbl">
            {t("sources.add_label", { defaultValue: "Add scan path" })}
          </div>
          <div className="a-set-row-sub">
            {t("sources.add_sub", {
              defaultValue: "Recrest scans this folder and every sub-folder for git repositories.",
            })}
          </div>
        </div>
        <div className="a-set-row-r a-src-input-row">
          <input
            className="a-set-input a-src-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addPath();
              }
            }}
            placeholder={t("sources.placeholder")}
            spellCheck={false}
          />
          <button
            type="button"
            className="r-btn"
            onClick={() => void pickDirectory()}
            disabled={busy}
          >
            <Icon name="folder" size={13} />
            {t("sources.browse", { defaultValue: "Browse…" })}
          </button>
          <button
            type="button"
            className="r-btn primary"
            onClick={() => void addPath()}
            disabled={busy || !draft.trim()}
          >
            <Icon name="plus" size={13} />
            {t("actions.add", { ns: "common" })}
          </button>
        </div>
      </div>

      {scanPaths.length === 0 ? (
        <div className="a-set-row a-src-empty">
          <Icon name="folder" size={18} />
          <div>
            <div className="a-src-empty-title">{t("sources.empty")}</div>
            <div className="a-src-empty-sub">{t("sources.empty_desc")}</div>
          </div>
        </div>
      ) : (
        scanPaths.map((path) => (
          <div key={path} className="a-set-row a-src-row">
            <div className="a-src-row-icon">
              <Icon name="folder" size={14} />
            </div>
            <div className="a-set-row-l a-src-row-path" title={path}>
              {path}
            </div>
            <div className="a-set-row-r">
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t("actions.remove", { ns: "common" })}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t("actions.remove", { ns: "common" })}</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("sources.confirm_remove_title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("sources.confirm_remove_desc", { path })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("actions.cancel", { ns: "common" })}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void removePath(path)}>
                      {t("actions.remove", { ns: "common" })}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))
      )}
    </SettingsSection>
  );
}
