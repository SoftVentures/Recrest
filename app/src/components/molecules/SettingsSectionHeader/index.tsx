import type { ReactNode } from "react";

interface SettingsSectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
}

/**
 * Heading + optional intro text at the top of every Settings tab body.
 * Replaces the ~6 inline `<div className="a-set-head"><h2/><p/></div>` copies
 * scattered across `SettingsPage.tsx` tab renderers.
 */
export function SettingsSectionHeader({ title, description }: SettingsSectionHeaderProps) {
  return (
    <div className="a-set-head">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
