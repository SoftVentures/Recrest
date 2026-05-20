import { type ComponentProps } from "react";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Brand-tinted Radix switch. The checked state uses the Recrest accent
 * (coral by default, picks up `data-accent` overrides), so the active
 * pill stands out in both light and dark mode without falling back to
 * the raw `--ink-0` swap that previously rendered as either solid black
 * (light) or solid white (dark) — both of which read as "broken" against
 * the surrounding card.
 *
 * The thumb stays opaque white in both states so the iOS-style contrast
 * holds up over the accent fill.
 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)]",
        "data-[state=unchecked]:bg-[var(--surface-3)] data-[state=unchecked]:border-[var(--border)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-[18px] w-[18px] translate-x-[1px] rounded-full bg-white shadow-[0_1px_2px_rgba(17,17,22,0.18)] transition-transform",
          "data-[state=checked]:translate-x-[17px] data-[state=unchecked]:translate-x-[1px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
