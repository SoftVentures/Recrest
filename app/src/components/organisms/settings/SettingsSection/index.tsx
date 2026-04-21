import { type ReactNode } from "react";

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
      {description && (
        <div className="a-set-section-desc" data-testid="settings-section-desc">
          {description}
        </div>
      )}
      <div className="a-set-card">{children}</div>
    </section>
  );
}
