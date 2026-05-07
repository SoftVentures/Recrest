import { type ReactNode, useCallback, useRef, useState } from "react";

import {
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from "@/components/atoms/ConfirmDialog/useConfirm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";

/**
 * Plan 1 §D.3: shared confirmation-dialog primitive.
 *
 * Wraps the existing Dialog atoms with a promise-based API. Mount
 * `<ConfirmProvider>` near the app root, then call `useConfirm()` from any
 * component to open a modal and `await` the user's choice. The hook and
 * context live in `./useConfirm.ts` so this file stays component-only and
 * Fast Refresh keeps working.
 *
 * The provider keeps a single dialog instance, so concurrent calls are
 * serialised — a second `confirm()` rejects the first one.
 */

interface PendingState {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const pendingRef = useRef<PendingState | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // If a previous confirm is still open, resolve it as cancelled. Two
      // dialogs at once would visually stack with no way for the user to
      // address the older one.
      if (pendingRef.current) {
        pendingRef.current.resolve(false);
      }
      const next: PendingState = { opts, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(ok);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          // Pressing ESC / clicking outside resolves as cancelled.
          if (!open) close(false);
        }}
      >
        <DialogContent className="max-w-sm" data-testid="confirm-dialog">
          <DialogHeader>
            <DialogTitle>{pending?.opts.title}</DialogTitle>
            {pending?.opts.description && (
              <DialogDescription>{pending.opts.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="r-btn ghost"
              onClick={() => close(false)}
              data-testid="confirm-dialog-cancel"
            >
              {pending?.opts.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              className={`r-btn ${pending?.opts.destructive ? "destructive" : "primary"}`}
              data-tone={pending?.opts.destructive ? "destructive" : undefined}
              onClick={() => close(true)}
              autoFocus
              data-testid="confirm-dialog-confirm"
            >
              {pending?.opts.confirmLabel ?? "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
