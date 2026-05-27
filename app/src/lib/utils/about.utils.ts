import type { GitInfo } from "@recrest/shared";

const DASH = "—";

/** Renders an ISO build timestamp in the UTC-tagged "YYYY-MM-DD HH:MM UTC" form. */
export function formatBuildTime(iso: string | undefined): string {
  if (!iso) return DASH;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}

/** Renders the user-facing description for a detected git install (or its absence). */
export function gitDescription(info: GitInfo | null): string {
  if (!info || !info.installed) return "not installed";
  const version = info.version ?? "installed";
  return info.path ? `${version} · ${info.path}` : version;
}
