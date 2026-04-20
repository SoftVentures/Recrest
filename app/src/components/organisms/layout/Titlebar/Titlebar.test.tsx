import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Titlebar } from "@/components/organisms/layout/Titlebar";
import { useWindowChrome } from "@/hooks/usePlatform";

// The Titlebar dispatcher picks a platform-specific chrome via `useWindowChrome`.
// Default (no Tauri) → "none" → component renders nothing. Mock the hook so we
// can exercise every branch.
vi.mock("@/hooks/usePlatform", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/hooks/usePlatform");
  return {
    ...actual,
    useWindowChrome: vi.fn(),
  };
});

const mockedUseWindowChrome = vi.mocked(useWindowChrome);

describe("Titlebar", () => {
  it("renders nothing in pure web mode", () => {
    mockedUseWindowChrome.mockReturnValue("none");
    const { container } = render(<Titlebar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the macOS overlay chrome", () => {
    mockedUseWindowChrome.mockReturnValue("macos-overlay");
    const { container } = render(<Titlebar />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the GNOME chrome", () => {
    mockedUseWindowChrome.mockReturnValue("gnome");
    const { container } = render(<Titlebar />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the Win11 chrome", () => {
    mockedUseWindowChrome.mockReturnValue("win11");
    const { container } = render(<Titlebar />);
    expect(container.firstChild).not.toBeNull();
  });
});
