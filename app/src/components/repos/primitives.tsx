import type { CSSProperties } from "react";

import { UNKNOWN_LANGUAGE, languageByExtension, languageByName } from "@recrest/shared";

import { Icon } from "@/components/icons/Icon";

/** Resolves the user-facing label + color for a language identifier.
 *  Accepts either a file extension (e.g. "rs") or a canonical linguist
 *  name (e.g. "Rust"). Falls back to a neutral "Other" when unknown. */
export function langMeta(lang: string | null | undefined): { label: string; color: string } {
  if (!lang) return toLabel(UNKNOWN_LANGUAGE);
  const byExt = languageByExtension(lang);
  if (byExt) return toLabel(byExt);
  const byName = languageByName(lang);
  if (byName) return toLabel(byName);
  return toLabel(UNKNOWN_LANGUAGE);
}

function toLabel(meta: { name: string; color: string | null }): { label: string; color: string } {
  return { label: meta.name, color: meta.color ?? UNKNOWN_LANGUAGE.color ?? "#8a8a9a" };
}

// ─── LangDot ─────────────────────────────────────────────────────────────
export function LangDot({ lang }: { lang: string | null | undefined }) {
  const meta = langMeta(lang);
  return <span className="lang-dot" style={{ background: meta.color }} title={meta.label} />;
}

// ─── AheadBehind chip ────────────────────────────────────────────────────
interface AheadBehindProps {
  ahead: number;
  behind: number;
  compact?: boolean;
}
export function AheadBehind({ ahead, behind, compact }: AheadBehindProps) {
  if (!ahead && !behind) {
    return compact ? null : (
      <span className="ab-chip">
        <span className="ab-zero">↕ 0</span>
      </span>
    );
  }
  return (
    <span className="ab-chip">
      {ahead > 0 && <span className="ab-up">↑{ahead}</span>}
      {behind > 0 && <span className="ab-down">↓{behind}</span>}
    </span>
  );
}

// ─── DiffStat "+12 −53" ─────────────────────────────────────────────────
const DIFF_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  display: "inline-flex",
  gap: 6,
};

export function DiffStat({ added, removed }: { added: number; removed: number }) {
  if (!added && !removed) return null;
  return (
    <span style={DIFF_STYLE}>
      {added > 0 && <span style={{ color: "var(--green)" }}>+{added}</span>}
      {removed > 0 && <span style={{ color: "var(--red)" }}>−{removed}</span>}
    </span>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  active?: boolean;
  width?: number;
  height?: number;
}
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

// ─── CI status dot ──────────────────────────────────────────────────────
export type CIState = "passing" | "failing" | "running" | null | undefined;
export function CIDot({ state }: { state: CIState }) {
  if (!state) return <span style={{ color: "var(--ink-4)", fontSize: 11 }}>—</span>;
  const map = {
    passing: { dot: "var(--green)", label: "passing" },
    failing: { dot: "var(--red)", label: "failing" },
    running: { dot: "var(--amber)", label: "running" },
  } as const;
  const m = map[state];
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

// ─── Status dot (repo list prefix) ──────────────────────────────────────
export type StatusKind = "clean" | "dirty" | "stale" | "behind";
export function StatusDot({ kind }: { kind: StatusKind }) {
  return <span className={`status-dot ${kind}`} />;
}

// ─── Branch chip ────────────────────────────────────────────────────────
interface BranchChipProps {
  branch: string;
  size?: "sm" | "md" | "big";
}
export function BranchChip({ branch, size = "md" }: BranchChipProps) {
  const cls = `a-branch-chip${size === "sm" ? " sm" : size === "big" ? " big" : ""}`;
  return (
    <span className={cls}>
      <Icon name="branch" size={size === "sm" ? 10 : size === "big" ? 12 : 11} />
      <span>{branch}</span>
    </span>
  );
}

// ─── Kbd ────────────────────────────────────────────────────────────────
export function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="kbd">{children}</span>;
}
