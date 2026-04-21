import { type ComponentType, type ReactNode } from "react";

import { Mascot, type MascotVariant } from "@/components/atoms/Mascot";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional Lucide-style icon. Ignored when `mascot` is set. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Friendly Recrest character to show above the text. Takes precedence over `icon`. */
  mascot?: MascotVariant;
  /** Pixel size of the mascot SVG. Default 112; use ~88 in compact cards. */
  mascotSize?: number;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  mascot,
  mascotSize,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center",
        className,
      )}
    >
      {mascot ? (
        <Mascot variant={mascot} size={mascotSize} className="text-foreground/85" />
      ) : (
        Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        )
      )}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
