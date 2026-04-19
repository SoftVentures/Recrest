import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { storageKeyForConfirmSkip } from "@recrest/shared";

import { Checkbox } from "@/components/atoms/Checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/molecules/compounds/AlertDialog";

/**
 * Single source of truth for "are you sure?" prompts. Each caller supplies
 * a stable `rememberKey` so the user's "don't ask again" choice survives
 * across sessions via `localStorage`. Keys are namespaced via
 * `storageKeyForConfirmSkip()` (see `@recrest/shared`).
 */
const skipKey = storageKeyForConfirmSkip;

// eslint-disable-next-line react-refresh/only-export-components
export function isConfirmSkipped(key: string): boolean {
  try {
    return localStorage.getItem(skipKey(key)) === "1";
  } catch {
    return false;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function setConfirmSkipped(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(skipKey(key), "1");
    else localStorage.removeItem(skipKey(key));
  } catch {
    /* no-op */
  }
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Visual tone for the confirm button. Destructive highlights the action. */
  tone?: "default" | "destructive";
  /** When present, shows a "don't ask again" checkbox and remembers the
   *  choice under this key. Omit to force confirmation every time. */
  rememberKey?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Controlled confirm dialog. Pair it with `useConfirmOnce` for callers that
 * want a simple "confirm unless the user opted out" workflow.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  rememberKey,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSkip(false);
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (rememberKey && skip) setConfirmSkipped(rememberKey, true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {rememberKey && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={skip} onCheckedChange={(v) => setSkip(v === true)} />
            <span>{t("confirm.skip", { defaultValue: "Don't ask again for this action" })}</span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {cancelLabel ?? t("actions.cancel", { ns: "common", defaultValue: "Cancel" })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            data-tone={tone}
            className={tone === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}
            disabled={busy}
          >
            {confirmLabel ?? t("actions.confirm", { ns: "common", defaultValue: "Confirm" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook that wraps `ConfirmDialog` with a promise-based API. Call `confirm()`
 * with the prompt details; it resolves to `true` if the user confirmed (or
 * had previously opted out), `false` otherwise. Mount the returned `<node>`
 * anywhere in the tree.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm"> & {
        resolve: (ok: boolean) => void;
      })
    | null
  >(null);

  const confirm = useCallback(
    (opts: Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm">): Promise<boolean> => {
      if (opts.rememberKey && isConfirmSkipped(opts.rememberKey)) {
        return Promise.resolve(true);
      }
      return new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      });
    },
    [],
  );

  const node = useMemo(() => {
    if (!state) return null;
    const close = (ok: boolean) => {
      state.resolve(ok);
      setState(null);
    };
    return (
      <ConfirmDialog
        {...state}
        open={true}
        onOpenChange={(o) => {
          if (!o) close(false);
        }}
        onConfirm={() => close(true)}
      />
    );
  }, [state]);

  return { confirm, node } as const;
}
