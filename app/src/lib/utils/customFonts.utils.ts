import type { CustomFont } from "@recrest/shared";

// Family → registered FontFace, so repeated syncs don't re-decode + re-add the
// same face (the Font Loading API would otherwise stack duplicates).
const registered = new Map<string, FontFace>();

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Reconcile the document's registered `FontFace`s with the current custom-font
 * list: register any newly-uploaded family and drop any that was deleted.
 * Idempotent — safe to call on every `customFonts` change. No-op where the
 * Font Loading API is unavailable (SSR / older engines).
 */
export async function syncCustomFontFaces(fonts: CustomFont[]): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const wanted = new Set(fonts.map((f) => f.family));

  for (const [family, face] of registered) {
    if (!wanted.has(family)) {
      document.fonts.delete(face);
      registered.delete(family);
    }
  }

  for (const font of fonts) {
    if (registered.has(font.family)) continue;
    try {
      // `.buffer` is a freshly-allocated, exactly-sized ArrayBuffer (see
      // `base64ToBytes`); the cast just narrows away the ArrayBufferLike union.
      const face = new FontFace(font.family, base64ToBytes(font.data).buffer as ArrayBuffer);
      await face.load();
      document.fonts.add(face);
      registered.set(font.family, face);
    } catch (err) {
      console.warn("[fonts] failed to register custom font", font.family, err);
    }
  }
}
