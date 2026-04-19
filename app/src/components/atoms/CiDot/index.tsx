export type CiState = "passing" | "failing" | "running" | null | undefined;

interface CiDotProps {
  state: CiState;
}

const COLORS = {
  passing: { dot: "var(--green)", label: "passing" },
  failing: { dot: "var(--red)", label: "failing" },
  running: { dot: "var(--amber)", label: "running" },
} as const;

/** Small colored CI-status pill. Grey em-dash when there's no status.
 *  Running state gets a soft pulse + halo. */
export function CiDot({ state }: CiDotProps) {
  if (!state) return <span style={{ color: "var(--ink-4)", fontSize: 11 }}>—</span>;
  const m = COLORS[state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: "var(--ink-2)",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: m.dot,
          boxShadow: state === "running" ? `0 0 0 3px ${m.dot}22` : "none",
          animation: state === "running" ? "pulseDot 1.2s ease-in-out infinite" : "none",
        }}
      />
      {m.label}
    </span>
  );
}
