import { describe, expect, it } from "vitest";

import { isTrashPath } from "@/lib/repoEnrich";

describe("isTrashPath", () => {
  it("matches Windows $RECYCLE.BIN paths case-insensitively", () => {
    expect(isTrashPath("C:\\$Recycle.Bin\\S-1-5-21-xxx\\$RHJZHZX")).toBe(true);
    expect(isTrashPath("D:\\$RECYCLE.BIN\\S-1-5-21-4240369032-956")).toBe(true);
  });

  it("matches macOS .Trash and .Trashes", () => {
    expect(isTrashPath("/Users/me/.Trash/old-repo")).toBe(true);
    expect(isTrashPath("/Volumes/ext/.Trashes/501/old")).toBe(true);
  });

  it("matches Linux trash variants", () => {
    expect(isTrashPath("/home/me/.local/share/Trash/files/foo")).toBe(true);
    expect(isTrashPath("/media/me/usb/.Trash-1000/foo")).toBe(true);
  });

  it("does NOT match user folders that merely contain the word trash", () => {
    expect(isTrashPath("/Users/me/projects/trashcan")).toBe(false);
    expect(isTrashPath("C:\\code\\Trashlib")).toBe(false);
    expect(isTrashPath("/home/me/Trash-notes.md")).toBe(false);
  });

  it("does not match normal project paths", () => {
    expect(isTrashPath("D:\\Organizations\\SoftVentures\\Recrest")).toBe(false);
    expect(isTrashPath("/Users/me/dev/recrest")).toBe(false);
  });
});
