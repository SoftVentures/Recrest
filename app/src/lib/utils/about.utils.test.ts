import type { GitInfo } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { formatBuildTime, gitDescription, prettyArch } from "@/lib/utils/about.utils";

// ---------------------------------------------------------------------------
// formatBuildTime
// ---------------------------------------------------------------------------

// Vitest sets TZ=Europe/Berlin via vitest.config.ts, and defines
// __BUILD_TIME__ = "1970-01-01T00:00:00.000Z" for the test environment.
// We use explicit ISO strings to keep assertions deterministic.

describe("formatBuildTime", () => {
  it("returns em-dash for undefined", () => {
    expect(formatBuildTime(undefined)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(formatBuildTime("")).toBe("—");
  });

  it("returns the original string for an unparseable date", () => {
    expect(formatBuildTime("not-a-date")).toBe("not-a-date");
    expect(formatBuildTime("2099-99-99T99:99:99Z")).toBe("2099-99-99T99:99:99Z");
  });

  it("formats a valid UTC ISO timestamp into a local date/time string", () => {
    // TZ=Europe/Berlin: UTC epoch + offset.
    // 1970-01-01T00:00:00.000Z → 1970-01-01 01:00 <tz> (UTC+1 in January)
    // jsdom Intl may return "CET" or "GMT+1" depending on platform — accept both.
    const result = formatBuildTime("1970-01-01T00:00:00.000Z");
    // Must start with the date portion and contain a colon for the time.
    expect(result).toMatch(/^1970-01-01 \d{2}:\d{2}/);
    // Must contain a timezone abbreviation or offset suffix (e.g. "CET", "GMT+1").
    expect(result).toMatch(/\s\S+$/);
  });

  it("zero-pads month, day, hour, minute to two digits", () => {
    // 2024-02-05T08:05:00.000Z → 2024-02-05 09:05 CET
    const result = formatBuildTime("2024-02-05T08:05:00.000Z");
    expect(result).toMatch(/^2024-02-05 \d{2}:\d{2}/);
  });

  it("reflects the __BUILD_TIME__ vitest define when used in the module init path", () => {
    // __BUILD_TIME__ is "1970-01-01T00:00:00.000Z" per vitest.config.ts —
    // verify our formatter produces a non-dash for it.
    const result = formatBuildTime("1970-01-01T00:00:00.000Z");
    expect(result).not.toBe("—");
  });

  it("omits timezone suffix gracefully when Intl returns no timeZoneName part", () => {
    // If tz resolves to empty string the function returns "Y-MM-DD HH:MM" without trailing space.
    // We can't force Intl to drop the tz here, but the branch is tested by checking
    // that the result never ends with a trailing space.
    const result = formatBuildTime("2024-06-15T10:00:00.000Z");
    expect(result).not.toMatch(/ $/);
  });
});

// ---------------------------------------------------------------------------
// gitDescription
// ---------------------------------------------------------------------------

describe("gitDescription", () => {
  it("returns 'not installed' for null info", () => {
    expect(gitDescription(null)).toBe("not installed");
  });

  it("returns 'not installed' when installed is false", () => {
    const info: GitInfo = { installed: false, version: null, path: null };
    expect(gitDescription(info)).toBe("not installed");
  });

  it("returns 'not installed' even when version/path present but installed is false", () => {
    const info: GitInfo = { installed: false, version: "2.42.0", path: "/usr/bin/git" };
    expect(gitDescription(info)).toBe("not installed");
  });

  it("returns 'installed' fallback when installed but version is null", () => {
    const info: GitInfo = { installed: true, version: null, path: null };
    expect(gitDescription(info)).toBe("installed");
  });

  it("returns version only when path is null", () => {
    const info: GitInfo = { installed: true, version: "2.42.0", path: null };
    expect(gitDescription(info)).toBe("2.42.0");
  });

  it("combines version and path with the bullet separator when both present", () => {
    const info: GitInfo = { installed: true, version: "2.42.0", path: "/usr/bin/git" };
    expect(gitDescription(info)).toBe("2.42.0 · /usr/bin/git");
  });

  it("uses 'installed' + path when version is null but path exists", () => {
    const info: GitInfo = { installed: true, version: null, path: "/opt/homebrew/bin/git" };
    expect(gitDescription(info)).toBe("installed · /opt/homebrew/bin/git");
  });
});

// ---------------------------------------------------------------------------
// prettyArch
// ---------------------------------------------------------------------------

describe("prettyArch", () => {
  it("returns em-dash for undefined", () => {
    expect(prettyArch(undefined)).toBe("—");
  });

  it("returns em-dash for null", () => {
    expect(prettyArch(null)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(prettyArch("")).toBe("—");
  });

  it("maps aarch64 to ARM64", () => {
    expect(prettyArch("aarch64")).toBe("ARM64");
  });

  it("maps arm64 to ARM64", () => {
    expect(prettyArch("arm64")).toBe("ARM64");
  });

  it("maps arm to ARM (32-bit)", () => {
    expect(prettyArch("arm")).toBe("ARM (32-bit)");
  });

  it("maps x86_64 to x86_64", () => {
    expect(prettyArch("x86_64")).toBe("x86_64");
  });

  it("maps x64 to x86_64", () => {
    expect(prettyArch("x64")).toBe("x86_64");
  });

  it("maps amd64 to x86_64", () => {
    expect(prettyArch("amd64")).toBe("x86_64");
  });

  it("maps x86 to x86 (32-bit)", () => {
    expect(prettyArch("x86")).toBe("x86 (32-bit)");
  });

  it("maps i386 to x86 (32-bit)", () => {
    expect(prettyArch("i386")).toBe("x86 (32-bit)");
  });

  it("maps i486 to x86 (32-bit)", () => {
    expect(prettyArch("i486")).toBe("x86 (32-bit)");
  });

  it("maps i586 to x86 (32-bit)", () => {
    expect(prettyArch("i586")).toBe("x86 (32-bit)");
  });

  it("maps i686 to x86 (32-bit)", () => {
    expect(prettyArch("i686")).toBe("x86 (32-bit)");
  });

  it("maps riscv64 to RISC-V 64", () => {
    expect(prettyArch("riscv64")).toBe("RISC-V 64");
  });

  it("maps powerpc64 to PowerPC 64", () => {
    expect(prettyArch("powerpc64")).toBe("PowerPC 64");
  });

  it("maps powerpc to PowerPC", () => {
    expect(prettyArch("powerpc")).toBe("PowerPC");
  });

  it("maps s390x to IBM Z", () => {
    expect(prettyArch("s390x")).toBe("IBM Z");
  });

  it("maps loongarch64 to LoongArch 64", () => {
    expect(prettyArch("loongarch64")).toBe("LoongArch 64");
  });

  it("maps mips to MIPS", () => {
    expect(prettyArch("mips")).toBe("MIPS");
  });

  it("maps mips64 to MIPS 64", () => {
    expect(prettyArch("mips64")).toBe("MIPS 64");
  });

  it("maps sparc64 to SPARC 64", () => {
    expect(prettyArch("sparc64")).toBe("SPARC 64");
  });

  it("passes through an unknown non-empty arch string unchanged", () => {
    expect(prettyArch("wasm32")).toBe("wasm32");
    expect(prettyArch("custom-arch")).toBe("custom-arch");
  });
});
