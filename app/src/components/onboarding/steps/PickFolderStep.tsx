import { useState } from "react";

import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function PickFolderStep({ onBack, onNext }: Props) {
  const { t } = useTranslation("onboarding");
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [draft, setDraft] = useState("");
  const [browsing, setBrowsing] = useState(false);

  const persist = async (next: string[]) => {
    try {
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
    } catch {
      toast.error(t("errors.internal", { ns: "errors" }));
    }
  };

  const addPath = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed || scanPaths.includes(trimmed)) return;
    await persist([...scanPaths, trimmed]);
    setDraft("");
  };

  const removePath = async (path: string) => {
    await persist(scanPaths.filter((p) => p !== path));
  };

  const browse = async () => {
    if (!isTauri()) return;
    setBrowsing(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("pickFolder.title"),
      });
      if (typeof selected === "string") {
        await addPath(selected);
      }
    } catch (err) {
      console.warn("[onboarding] folder picker failed:", err);
    } finally {
      setBrowsing(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("pickFolder.title")}</DialogTitle>
        <DialogDescription>{t("pickFolder.body")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addPath(draft);
              }
            }}
            placeholder={t("pickFolder.browse_placeholder")}
            className="flex-1"
          />
          {isTauri() ? (
            <Button
              variant="outline"
              onClick={() => void browse()}
              loading={browsing}
            >
              <FolderOpen aria-hidden />
              {t("pickFolder.browse")}
            </Button>
          ) : (
            <Button onClick={() => void addPath(draft)} disabled={!draft.trim()}>
              <Plus aria-hidden />
              {t("pickFolder.add")}
            </Button>
          )}
        </div>

        {scanPaths.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {t("pickFolder.list_empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {scanPaths.map((path) => (
              <li
                key={path}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span
                  className="flex-1 truncate font-mono text-xs text-muted-foreground"
                  title={path}
                >
                  {path}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void removePath(path)}
                  aria-label={t("actions.remove", { ns: "common" })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onBack}>
          {t("pickFolder.back")}
        </Button>
        <Button
          onClick={onNext}
          disabled={scanPaths.length === 0}
          title={scanPaths.length === 0 ? t("pickFolder.at_least_one") : undefined}
        >
          {t("pickFolder.next")}
        </Button>
      </DialogFooter>
    </>
  );
}
