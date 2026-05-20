import IconDark from "@/assets/recrest-icon-dark.svg?react";
import IconDevDark from "@/assets/recrest-icon-dev-dark.svg?react";
import IconDevLight from "@/assets/recrest-icon-dev-light.svg?react";
import IconLight from "@/assets/recrest-icon-light.svg?react";
import { cn } from "@/lib/utils";

interface AppIconProps {
  className?: string;
  /** Visual label read by screen readers (defaults to "Recrest"). */
  title?: string;
}

/**
 * Full app-icon tile (white/dark rounded square + chevrons), the same
 * artwork used for the macOS `.icns` / Windows `.ico` bundle. Unlike
 * `Logo` (which strips the tile and renders the chevrons in
 * `currentColor`), this component is the literal icon a user sees in
 * their dock, taskbar or window proxy — required by the OS-native
 * window-chrome conventions.
 *
 * Picks the dev-tagged variant automatically in dev builds; Vite drops
 * the unused imports under tree-shaking at production build time.
 *
 * Renders both theme variants so a `data-theme` flip on `<html>` swaps
 * the visible one via the `dark` variant without re-rendering React.
 */
export function AppIcon({ className, title = "Recrest" }: AppIconProps) {
  const Light = import.meta.env.DEV ? IconDevLight : IconLight;
  const Dark = import.meta.env.DEV ? IconDevDark : IconDark;
  return (
    <span className={cn("relative inline-block", className)} role="img" aria-label={title}>
      <Light className="block h-full w-full dark:hidden" aria-hidden />
      <Dark className="hidden h-full w-full dark:block" aria-hidden />
    </span>
  );
}
