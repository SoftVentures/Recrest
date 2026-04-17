import { type ReactNode } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled block used repeatedly in SettingsPage. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Separator />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface SettingsFieldProps {
  label: ReactNode;
  description?: ReactNode;
  /** Short explanatory tooltip shown next to the label. */
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  /** Stack control under label on small screens and when control is wide. */
  layout?: "inline" | "stacked";
  className?: string;
}

/** Label+control row. Responsive: stacks under 640px. */
export function SettingsField({
  label,
  description,
  hint,
  htmlFor,
  children,
  layout = "inline",
  className,
}: SettingsFieldProps) {
  const labelNode = (
    <span className="inline-flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {hint && <InfoHint>{hint}</InfoHint>}
    </span>
  );

  if (layout === "stacked") {
    return (
      <div className={cn("space-y-2", className)}>
        <div>
          {labelNode}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {labelNode}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
