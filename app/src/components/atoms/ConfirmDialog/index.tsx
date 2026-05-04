import { type ReactNode, createContext, useCallback, useContext, useRef, useState } from "react";

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
 * component to open a modal and `await` the user's choice:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete repo?" }))) return;
 *
 * The provider keeps a single dialog instance, so concurrent calls are
 * serialised — a second `confirm()` rejects the first one.
 */

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, styles the confirm button with the destructive accent.
   *  Defaults to `false`. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

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
            <button type="button" className="r-btn ghost" onClick={() => close(false)}>
              {pending?.opts.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              className={`r-btn ${pending?.opts.destructive ? "destructive" : "primary"}`}
              onClick={() => close(true)}
              autoFocus
            >
              {pending?.opts.confirmLabel ?? "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return fn;
}
