import { describe, expect, it } from "vitest";

import SystemInfoPanel from "@/components/molecules/SystemInfoPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithTheme } from "@/test/utils";

describe("SystemInfoPanel", () => {
  it("renders OS, git, and app rows from provided facts", () => {
    const { getByTestId } = renderWithTheme(
      <SystemInfoPanel
        initialFacts={{
          os: "macos",
          arch: "x86_64",
          osVersion: "15.0",
          gitVersion: "2.44.0",
          appVersion: "0.9.1",
        }}
      />,
    );
    expect(getByTestId(TEST_IDS.settings.storage.systemPanel)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.storage.systemOs).textContent).toContain(
      "macos 15.0 (x86_64)",
    );
    expect(getByTestId(TEST_IDS.settings.storage.systemGit).textContent).toContain("2.44.0");
    expect(getByTestId(TEST_IDS.settings.storage.systemApp).textContent).toContain("v0.9.1");
  });

  it("falls back gracefully when osVersion/gitVersion are missing", () => {
    const { getByTestId } = renderWithTheme(
      <SystemInfoPanel
        initialFacts={{
          os: "linux",
          arch: "aarch64",
          appVersion: "0.9.1",
        }}
      />,
    );
    expect(getByTestId(TEST_IDS.settings.storage.systemOs).textContent).toContain("linux (ARM64)");
    expect(getByTestId(TEST_IDS.settings.storage.systemGit).textContent).toContain("—");
  });

  it("renders static fallback rows when no initialFacts are provided (non-Tauri)", () => {
    const { getByTestId } = renderWithTheme(<SystemInfoPanel />);
    expect(getByTestId(TEST_IDS.settings.storage.systemPanel)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.storage.systemOs).textContent).toContain("—");
    expect(getByTestId(TEST_IDS.settings.storage.systemGit).textContent).toContain("—");
    expect(getByTestId(TEST_IDS.settings.storage.systemApp).textContent).toMatch(/^.*v\d/);
  });
});
