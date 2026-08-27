import { describe, expect, it } from "vitest";

import type { DownloadChannel, FileChannel } from "./downloadUrl";
import { buildDownloadUrl, getChannelsForOs } from "./downloadUrl";

const REPO = "https://github.com/SoftVentures/Recrest";
const VERSION = "0.4.2";

const files = (channels: DownloadChannel[]): FileChannel[] =>
  channels.filter((c): c is FileChannel => c.kind === "file");

describe("buildDownloadUrl", () => {
  it("constructs the releases/latest/download URL", () => {
    expect(buildDownloadUrl(REPO, "recrest-v0.4.2-mac-arm64.dmg")).toBe(
      "https://github.com/SoftVentures/Recrest/releases/latest/download/recrest-v0.4.2-mac-arm64.dmg",
    );
  });
});

describe("getChannelsForOs — macOS", () => {
  const channels = getChannelsForOs("macos", VERSION);

  it("returns two file channels", () => {
    expect(channels).toHaveLength(2);
    expect(files(channels)).toHaveLength(2);
  });

  it("arm64 asset has the correct filename", () => {
    const arm = files(channels).find((c) => c.arch === "arm64");
    expect(arm?.filename).toBe(`recrest-v${VERSION}-mac-arm64.dmg`);
  });

  it("x64 asset has the correct filename", () => {
    const x64 = files(channels).find((c) => c.arch === "x64");
    expect(x64?.filename).toBe(`recrest-v${VERSION}-mac-x64.dmg`);
  });
});

describe("getChannelsForOs — Windows", () => {
  const channels = getChannelsForOs("windows", VERSION);

  it("returns two file channels", () => {
    expect(channels).toHaveLength(2);
    expect(files(channels)).toHaveLength(2);
  });

  it("x64 exe has the correct filename", () => {
    expect(files(channels)[0]?.filename).toBe(`recrest-v${VERSION}-windows-x64.exe`);
  });

  it("arm64 exe has the correct filename", () => {
    expect(files(channels)[1]?.filename).toBe(`recrest-v${VERSION}-windows-arm64.exe`);
  });
});

describe("getChannelsForOs — Linux", () => {
  const channels = getChannelsForOs("linux", VERSION);

  it("returns two downloadable files plus the AUR command", () => {
    expect(channels).toHaveLength(3);
    expect(files(channels)).toHaveLength(2);
  });

  it("deb has the correct filename", () => {
    expect(files(channels)[0]?.filename).toBe(`recrest-v${VERSION}-linux-x64.deb`);
  });

  it("rpm has the correct filename", () => {
    expect(files(channels)[1]?.filename).toBe(`recrest-v${VERSION}-linux-x64.rpm`);
  });

  // Plan 11 dropped the AppImage. The release workflow no longer builds one, so
  // a link to it would 404 — this asserts the page cannot regrow that link.
  it("offers no AppImage", () => {
    expect(files(channels).some((c) => c.filename.endsWith(".AppImage"))).toBe(false);
  });

  it("offers the AUR package as a command, not a download", () => {
    const aur = channels.find((c) => c.kind === "command");
    expect(aur?.kind).toBe("command");
    expect(aur && "command" in aur ? aur.command : undefined).toBe("paru -S recrest-bin");
  });
});
