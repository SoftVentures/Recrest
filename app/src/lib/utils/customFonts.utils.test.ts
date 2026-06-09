import type { CustomFont } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `syncCustomFontFaces` keeps a module-level Map of already-registered faces so
// repeated syncs don't re-decode the same family. Each test re-imports the
// module fresh (via `vi.resetModules` + dynamic import) so that cache starts
// empty and cases stay independent.
type SyncFn = (typeof import("@/lib/utils/customFonts.utils"))["syncCustomFontFaces"];

class FakeFontFace {
  family: string;
  source: ArrayBuffer;
  constructor(family: string, source: ArrayBuffer) {
    this.family = family;
    this.source = source;
  }
  load(): Promise<this> {
    return Promise.resolve(this);
  }
}

let added: FakeFontFace[];
let deleted: FakeFontFace[];

function installFontApi(): void {
  added = [];
  deleted = [];
  vi.stubGlobal("FontFace", FakeFontFace);
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      add: (face: FakeFontFace) => added.push(face),
      delete: (face: FakeFontFace) => deleted.push(face),
    },
  });
}

async function loadSync(): Promise<SyncFn> {
  vi.resetModules();
  const mod = await import("@/lib/utils/customFonts.utils");
  return mod.syncCustomFontFaces;
}

function makeFont(family: string): CustomFont {
  // A valid base64 payload — `atob` runs over it during registration.
  return {
    id: family.toLowerCase(),
    family,
    fileName: `${family}.ttf`,
    format: "truetype",
    data: btoa("font-bytes"),
  };
}

describe("syncCustomFontFaces", () => {
  beforeEach(() => {
    installFontApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as unknown as { fonts?: unknown }).fonts;
  });

  it("registers a FontFace for each newly-listed family", async () => {
    const sync = await loadSync();

    await sync([makeFont("Fira Code"), makeFont("Inter")]);

    expect(added.map((f) => f.family)).toEqual(["Fira Code", "Inter"]);
    expect(deleted).toEqual([]);
  });

  it("does not re-add a family that is already registered", async () => {
    const sync = await loadSync();
    const fonts = [makeFont("Fira Code")];

    await sync(fonts);
    await sync(fonts);

    expect(added).toHaveLength(1);
    expect(deleted).toEqual([]);
  });

  it("de-registers a family that dropped out of the list", async () => {
    const sync = await loadSync();

    await sync([makeFont("Fira Code"), makeFont("Inter")]);
    added.length = 0;
    await sync([makeFont("Inter")]);

    expect(deleted.map((f) => f.family)).toEqual(["Fira Code"]);
    expect(added).toEqual([]);
  });

  it("no-ops when the Font Loading API is unavailable", async () => {
    delete (document as unknown as { fonts?: unknown }).fonts;
    const sync = await loadSync();

    await expect(sync([makeFont("Fira Code")])).resolves.toBeUndefined();
    expect(added).toEqual([]);
  });
});
