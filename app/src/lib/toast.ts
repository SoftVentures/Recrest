import { toast as sonner } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  /** Forwarded to sonner so callers can replace a specific toast — used to
   *  turn a `loading(...)` toast into a terminal success/error rather than
   *  stacking a second toast. */
  id?: string | number;
}

/**
 * Thin i18n-friendly wrapper around sonner. Call sites pass already-translated
 * strings — localization responsibility stays in components next to `t()`.
 */
export const toast = {
  success(message: string, options?: ToastOptions) {
    sonner.success(message, options);
  },
  error(message: string, options?: ToastOptions) {
    sonner.error(message, options);
  },
  info(message: string, options?: ToastOptions) {
    sonner(message, options);
  },
  warning(message: string, options?: ToastOptions) {
    sonner.warning(message, options);
  },
  loading(message: string, options?: ToastOptions) {
    return sonner.loading(message, options);
  },
  dismiss(id?: string | number) {
    sonner.dismiss(id);
  },
};
