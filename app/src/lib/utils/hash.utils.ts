/**
 * Tiny deterministic string hash used wherever we need a stable, content-derived
 * integer (avatar gradient slots, palette index, …). Not cryptographic.
 */
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
