import type { ReactNode } from "react";

interface KpiTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
}

/** Dashboard KPI tile — small card with a number, label, and optional
 *  sub-text. Clickable when `onClick` is provided. */
export function KpiTile({ label, value, sub, onClick }: KpiTileProps) {
  const Tag = (onClick ? "button" : "div") as "button" | "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className="a-dash-kpi"
      onClick={onClick}
      data-clickable={onClick ? "true" : undefined}
    >
      <div className="a-dash-kpi-lbl">{label}</div>
      <div className="a-dash-kpi-val">{value}</div>
      {sub && <div className="a-dash-kpi-sub">{sub}</div>}
    </Tag>
  );
}
