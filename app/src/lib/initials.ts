/**
 * Returns up to two uppercase letters suitable for an avatar fallback.
 * `"Anna Müller"` → `"AM"`, `"recrest"` → `"R"`, `""` → `""`.
 */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
