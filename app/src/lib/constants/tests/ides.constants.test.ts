import { describe, expect, it } from "vitest";

import { IDE_DEFINITIONS, IDE_IDS, IDE_UI } from "@/lib/constants/ides.constants";

describe("IDE constants", () => {
  it("IDE_UI covers every IdeId from the shared list", () => {
    expect(Object.keys(IDE_UI).sort()).toEqual([...IDE_IDS].sort());
  });

  it("IDE_DEFINITIONS covers every IdeId from the shared list", () => {
    expect(Object.keys(IDE_DEFINITIONS).sort()).toEqual([...IDE_IDS].sort());
  });

  it("vscode-insiders reuses the vscode logo with a hue rotation", () => {
    expect(IDE_UI["vscode-insiders"].logo).toBe("vscode");
    expect(IDE_UI["vscode-insiders"].filterHue).toBe(140);
  });

  it("regular IDEs render without a filter", () => {
    expect(IDE_UI.vscode.filterHue).toBeNull();
    expect(IDE_UI.cursor.filterHue).toBeNull();
    expect(IDE_UI.webstorm.filterHue).toBeNull();
    expect(IDE_UI.idea.filterHue).toBeNull();
  });
});
