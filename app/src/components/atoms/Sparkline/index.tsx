interface SparklineProps {
  data: number[];
  active?: boolean;
  width?: number;
  height?: number;
}

/** Tiny commit-activity bar chart. `data` is an arbitrary-length numeric
 *  series; bars auto-scale to the series max. Used in repo row sparklines
 *  and the dashboard 14-day activity strip. */
export function Sparkline({ data, active, width = 64, height = 18 }: SparklineProps) {
  const max = Math.max(...data, 1);
  const barW = Math.floor((width - (data.length - 1) * 2) / data.length);
  return (
    <div className={`spark${active ? " active" : ""}`} style={{ width, height }}>
      {data.map((v, i) => (
        <span
          key={i}
          className={v === 0 ? "zero" : ""}
          style={{ width: barW, height: `${Math.max(8, (v / max) * height)}px` }}
        />
      ))}
    </div>
  );
}
