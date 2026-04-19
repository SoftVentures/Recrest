import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

import { useAppSelector } from "@/store/hooks";

/**
 * App-wide Toaster. Mount once in AppShell. Individual `toast.success()`
 * / `toast.error()` calls happen in the lib/toast helper.
 */
export function Toaster(props: ToasterProps) {
  const theme = useAppSelector((s) => s.settings.theme);
  const resolvedTheme: ToasterProps["theme"] =
    theme === "system" ? "system" : theme === "dark" ? "dark" : "light";

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] rounded-md",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
