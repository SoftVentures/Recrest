import { useState } from "react";

import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { scanForRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";

export function RepoSources() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const addPath = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...scanPaths, trimmed]));
    setAdding(true);
    try {
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
      setDraft("");
      void dispatch(scanForRepos(next));
      toast.success(t("sources.added"));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    } finally {
      setAdding(false);
    }
  };

  const removePath = async (path: string) => {
    const next = scanPaths.filter((p) => p !== path);
    try {
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
      void dispatch(scanForRepos(next));
      toast.success(t("sources.removed"));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  return (
    <SettingsSection
      title={t("sections.sources")}
      description={t("sources.description")}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addPath();
            }
          }}
          placeholder={t("sources.placeholder")}
          className="flex-1"
        />
        <Button
          onClick={() => void addPath()}
          disabled={!draft.trim()}
          loading={adding}
        >
          <Plus aria-hidden />
          {t("actions.add", { ns: "common" })}
        </Button>
      </div>

      {scanPaths.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title={t("sources.empty")}
          description={t("sources.empty_desc")}
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {scanPaths.map((path) => (
            <li key={path} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span
                className="flex-1 truncate font-mono text-xs text-muted-foreground"
                title={path}
              >
                {path}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("actions.remove", { ns: "common" })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("sources.confirm_remove_title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("sources.confirm_remove_desc", { path })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("actions.cancel", { ns: "common" })}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => void removePath(path)}>
                      {t("actions.remove", { ns: "common" })}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
