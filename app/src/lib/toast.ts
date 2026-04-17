import { toast as sonner } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
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
  loading(message: string) {
    return sonner.loading(message);
  },
  dismiss(id?: string | number) {
    sonner.dismiss(id);
  },
};
