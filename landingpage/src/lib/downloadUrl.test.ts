import { describe, expect, it } from "vitest";

import { buildDownloadUrl, getAssetsForOs } from "./downloadUrl";

const REPO = "https://github.com/SoftVentures/Recrest";
const VERSION = "0.4.2";

describe("buildDownloadUrl", () => {
  it("constructs the releases/latest/download URL", () => {
    expect(buildDownloadUrl(REPO, "recrest-v0.4.2-mac-arm64.dmg")).toBe(
      "https://github.com/SoftVentures/Recrest/releases/latest/download/recrest-v0.4.2-mac-arm64.dmg",
    );
  });
});

describe("getAssetsForOs — macOS", () => {
  const assets = getAssetsForOs("macos", VERSION);

  it("returns two assets", () => {
    expect(assets).toHaveLength(2);
  });

  it("arm64 asset has the correct filename", () => {
    const arm = assets.find((a) => a.arch === "arm64");
    expect(arm?.filename).toBe(`recrest-v${VERSION}-mac-arm64.dmg`);
  });

  it("x64 asset has the correct filename", () => {
    const x64 = assets.find((a) => a.arch === "x64");
    expect(x64?.filename).toBe(`recrest-v${VERSION}-mac-x64.dmg`);
  });
});

describe("getAssetsForOs — Windows", () => {
  const assets = getAssetsForOs("windows", VERSION);

  it("returns two assets", () => {
    expect(assets).toHaveLength(2);
  });

  it("x64 exe has the correct filename", () => {
    expect(assets[0]?.filename).toBe(`recrest-v${VERSION}-windows-x64.exe`);
  });

  it("arm64 exe has the correct filename", () => {
    expect(assets[1]?.filename).toBe(`recrest-v${VERSION}-windows-arm64.exe`);
  });
});

describe("getAssetsForOs — Linux", () => {
  const assets = getAssetsForOs("linux", VERSION);

  it("returns three assets", () => {
    expect(assets).toHaveLength(3);
  });

  it("AppImage has the correct filename", () => {
    expect(assets[0]?.filename).toBe(`recrest-v${VERSION}-linux-x64.AppImage`);
  });

  it("deb has the correct filename", () => {
    expect(assets[1]?.filename).toBe(`recrest-v${VERSION}-linux-x64.deb`);
  });

  it("rpm has the correct filename", () => {
    expect(assets[2]?.filename).toBe(`recrest-v${VERSION}-linux-x64.rpm`);
  });
});
