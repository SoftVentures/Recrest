import IconDark from "@/assets/recrest-icon-transparent-dark.svg?react";
import IconWhite from "@/assets/recrest-icon-transparent-white.svg?react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Visual label read by screen readers (defaults to "Recrest"). */
  title?: string;
}

/**
 * Recrest chevron mark. Renders both theme variants and relies on the
 * `dark` class on `<html>` (set by useThemeEffect) to pick the right one —
 * this avoids a re-render on theme flips and keeps things SSR-safe.
 */
export function Logo({ className, title = "Recrest" }: LogoProps) {
  return (
    <span className={cn("relative inline-block", className)} role="img" aria-label={title}>
      <IconDark className="block h-full w-full dark:hidden" aria-hidden />
      <IconWhite className="hidden h-full w-full dark:block" aria-hidden />
    </span>
  );
}
