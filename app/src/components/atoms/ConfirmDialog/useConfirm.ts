import { type ReactNode, createContext, useContext } from "react";

/**
 * Plan 1 §D.3: shared confirmation-dialog primitive — public API.
 *
 * The hook + context live here (instead of next to the provider component)
 * so `index.tsx` can stay component-only, which keeps Fast Refresh
 * predictable. `<ConfirmProvider>` remains the entry point; consumers call
 * `useConfirm()` to open the modal and `await` the user's choice:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete repo?" }))) return;
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

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return fn;
}
