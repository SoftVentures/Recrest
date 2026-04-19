export type StatusKind = "clean" | "dirty" | "behind";

interface StatusDotProps {
  kind: StatusKind;
}

/** Coloured status dot used as a prefix in repo rows and detail summaries. */
export function StatusDot({ kind }: StatusDotProps) {
  return <span className={`status-dot ${kind}`} />;
}
