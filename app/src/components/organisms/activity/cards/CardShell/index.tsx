import type { ReactNode } from "react";

interface CardShellProps {
  title: string;
  sub?: string | null;
  className?: string;
  right?: ReactNode;
  children: ReactNode;
  /** When true, swap the body content for a shimmer placeholder while the
   *  data for this card is still in flight. Keeps chrome identical to the
   *  loaded state so the layout does not jump. */
  loading?: boolean;
  /** Preset shimmer shape used when `loading` is set. */
  skeleton?: "bars" | "donut" | "rows" | "line" | "heatmap" | "radial";
}

/** Shared card chrome for Activity-page organisms. */
export function CardShell({
  title,
  sub,
  className,
  right,
  children,
  loading,
  skeleton = "rows",
}: CardShellProps) {
  return (
    <div className={`a-act-card${className ? ` ${className}` : ""}`}>
      <div className="a-act-card-h">
        <div style={{ minWidth: 0 }}>
          <h3>{title}</h3>
          {sub && <div className="a-act-card-sub">{sub}</div>}
        </div>
        {right}
      </div>
      {loading ? <CardSkeleton shape={skeleton} /> : children}
    </div>
  );
}

function CardSkeleton({ shape }: { shape: NonNullable<CardShellProps["skeleton"]> }) {
  if (shape === "bars") {
    // 14 stacked-bar columns of varying heights.
    const heights = [35, 70, 55, 20, 65, 45, 80, 30, 60, 50, 75, 40, 55, 25];
    return (
      <div className="a-act-skel-bars" role="status" aria-busy>
        {heights.map((h, i) => (
          <span key={i} className="a-act-skel-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  if (shape === "donut") {
    return (
      <div className="a-act-skel-donut" role="status" aria-busy>
        <span className="a-act-skel-circle" />
        <div className="a-act-skel-legend">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="a-act-skel-legend-row" />
          ))}
        </div>
      </div>
    );
  }
  if (shape === "line") {
    return (
      <div className="a-act-skel-line" role="status" aria-busy>
        <span className="a-act-skel-line-path" />
      </div>
    );
  }
  if (shape === "heatmap") {
    return (
      <div className="a-act-skel-heatmap" role="status" aria-busy>
        {Array.from({ length: 7 * 24 }).map((_, i) => (
          <span key={i} className="a-act-skel-cell" />
        ))}
      </div>
    );
  }
  if (shape === "radial") {
    return (
      <div className="a-act-skel-radial" role="status" aria-busy>
        <span className="a-act-skel-radial-disc" />
      </div>
    );
  }
  // Default: a stack of listicle rows (churn, leaderboard, review queue).
  return (
    <div className="a-act-skel-rows" role="status" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="a-act-skel-row" />
      ))}
    </div>
  );
}
