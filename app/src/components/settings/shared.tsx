import { type ReactNode } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled block: small uppercase section label over a rounded card of rows.
 *  Matches the Appearance / Accessibility / System sections in the General tab. */
export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("a-set-section", className)}>
      <h3>{title}</h3>
      {description && <div className="a-set-section-desc">{description}</div>}
      <div className="a-set-card">{children}</div>
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
  /** Reserved for backwards compatibility — inline is the only layout now. */
  layout?: "inline" | "stacked";
  className?: string;
}

/** Single row inside a SettingsSection: label + description on the left,
 *  control on the right. */
export function SettingsField({
  label,
  description,
  hint,
  htmlFor,
  children,
  className,
}: SettingsFieldProps) {
  return (
    <div className={cn("a-set-row", className)}>
      <div className="a-set-row-l">
        <label htmlFor={htmlFor} className="a-set-row-lbl">
          {label}
          {hint && (
            <span className="a-set-row-hint">
              <InfoHint>{hint}</InfoHint>
            </span>
          )}
        </label>
        {description && <div className="a-set-row-sub">{description}</div>}
      </div>
      <div className="a-set-row-r">{children}</div>
    </div>
  );
}
