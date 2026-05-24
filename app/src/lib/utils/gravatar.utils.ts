const hashCache = new Map<string, string>();

export async function gravatarHash(email: string): Promise<string> {
  const key = email.trim().toLowerCase();
  const cached = hashCache.get(key);
  if (cached) return cached;
  const bytes = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  hashCache.set(key, hex);
  return hex;
}

// d=404 returns 404 when the email has no Gravatar so we can fall back to the
// deterministic gradient tile instead of hosting a generic identicon.
export function gravatarUrl(hash: string, sizePx: number): string {
  const px = Math.max(16, Math.round(sizePx * 2));
  return `https://www.gravatar.com/avatar/${hash}?s=${px}&d=404`;
}
