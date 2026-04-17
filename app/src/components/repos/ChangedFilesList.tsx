import { useTranslation } from "react-i18next";

import type { ChangedFile, ChangedFileStatus } from "@recrest/shared";

import { cn } from "@/lib/utils";

interface ChangedFilesListProps {
  files: ChangedFile[];
  truncated: boolean;
}

const MARKER: Record<ChangedFileStatus, { label: string; tone: string }> = {
  staged: { label: "A", tone: "bg-status-success/15 text-status-success" },
  unstaged: { label: "M", tone: "bg-status-warning/15 text-status-warning" },
  untracked: { label: "??", tone: "bg-status-info/15 text-status-info" },
  conflicted: { label: "!!", tone: "bg-status-error/15 text-status-error" },
};

/**
 * Condensed CLI-style list of the working-tree entries from libgit2.
 * Markers mirror `git status`'s conventions (A/M/??/!!).
 */
export function ChangedFilesList({ files, truncated }: ChangedFilesListProps) {
  const { t } = useTranslation("repos");

  if (files.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
        {t("detail.working_tree_clean")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <ul className="max-h-64 divide-y divide-border overflow-y-auto">
        {files.map((file, i) => {
          const marker = MARKER[file.status];
          return (
            <li
              key={`${file.path}-${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs"
            >
              <span
                aria-label={t(`detail.marker.${file.status}`)}
                title={t(`detail.marker.${file.status}`)}
                className={cn(
                  "inline-flex h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded-sm px-1 font-mono text-[10px] font-bold",
                  marker.tone,
                )}
              >
                {marker.label}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                {file.path}
              </span>
              {file.hasUnstagedChanges && (
                <span
                  title={t("detail.also_unstaged")}
                  className="shrink-0 rounded-sm bg-status-warning/15 px-1 py-0.5 font-mono text-[9px] font-bold text-status-warning"
                >
                  M
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {truncated && (
        <div className="border-t border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
          {t("detail.changes_truncated")}
        </div>
      )}
    </div>
  );
}
