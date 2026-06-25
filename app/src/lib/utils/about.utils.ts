import type { GitInfo } from "@recrest/shared";

const DASH = "—";

/** Renders an ISO build timestamp in the user's local timezone, e.g.
 *  "2026-06-17 11:36 CEST". The ISO layout is kept (no locale-specific date
 *  ordering) so it stays scannable regardless of where the user lives; only
 *  hour/minute/zone are localised. */
export function formatBuildTime(iso: string | undefined): string {
  if (!iso) return DASH;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const tz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    return tz ? `${y}-${mo}-${da} ${h}:${mi} ${tz}` : `${y}-${mo}-${da} ${h}:${mi}`;
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

/** Rust/LLVM arch strings → user-facing labels. The backend keeps the
 *  canonical id so logs stay diff-able; only the display layer prettifies.
 *  Covers every `std::env::consts::ARCH` value we'd realistically see on a
 *  desktop install — unknown strings pass through untouched. */
export function prettyArch(arch: string | undefined | null): string {
  switch (arch) {
    case "aarch64":
    case "arm64":
      return "ARM64";
    case "arm":
      return "ARM (32-bit)";
    case "x86_64":
    case "x64":
    case "amd64":
      return "x86_64";
    case "x86":
    case "i386":
    case "i486":
    case "i586":
    case "i686":
      return "x86 (32-bit)";
    case "riscv64":
      return "RISC-V 64";
    case "powerpc64":
      return "PowerPC 64";
    case "powerpc":
      return "PowerPC";
    case "s390x":
      return "IBM Z";
    case "loongarch64":
      return "LoongArch 64";
    case "mips":
      return "MIPS";
    case "mips64":
      return "MIPS 64";
    case "sparc64":
      return "SPARC 64";
    default:
      return arch && arch.length > 0 ? arch : DASH;
  }
}
