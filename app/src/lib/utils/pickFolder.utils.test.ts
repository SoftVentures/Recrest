import { beforeEach, describe, expect, it, vi } from "vitest";

import { isTauri } from "@/lib/tauri";
import { pickFile, pickFolder, pickFontFile, pickImageFile } from "@/lib/utils/pickFolder.utils";

// ---------------------------------------------------------------------------
// Mock strategy
//
// pickFolder/pickFile/pickFontFile/pickImageFile all:
//   1. Check isTauri() — gate on __TAURI_INTERNALS__ presence.
//   2. Dynamically import "@tauri-apps/plugin-dialog" and call open(...).
//   3. Return the string result or null on cancel / error.
//
// We mock @/lib/tauri so isTauri() is controllable without touching the
// window object.  We also mock the dynamic import for the dialog plugin.
// ---------------------------------------------------------------------------

vi.mock("@/lib/tauri", () => ({
  isTauri: vi.fn(),
}));

// Provide a controllable `open` fn that the dynamic import resolves to.
const mockOpen = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mockOpen,
}));

const isTauriMock = vi.mocked(isTauri);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// pickFolder
// ---------------------------------------------------------------------------

describe("pickFolder", () => {
  it("returns null immediately when not running inside Tauri", async () => {
    isTauriMock.mockReturnValue(false);
    const result = await pickFolder();
    expect(result).toBeNull();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("returns the chosen folder path when the user picks one", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/home/user/projects");
    const result = await pickFolder();
    expect(result).toBe("/home/user/projects");
  });

  it("passes directory:true and multiple:false to the dialog", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/some/path");
    await pickFolder();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ directory: true, multiple: false }),
    );
  });

  it("passes defaultPath when provided", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/chosen");
    await pickFolder("/default/path");
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "/default/path" }),
    );
  });

  it("passes undefined for defaultPath when the argument is omitted", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/chosen");
    await pickFolder();
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: undefined }));
  });

  it("returns null when the user cancels (open returns null)", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(null);
    const result = await pickFolder();
    expect(result).toBeNull();
  });

  it("returns null when open returns an array (multiple:false guard)", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(["/a", "/b"]);
    const result = await pickFolder();
    expect(result).toBeNull();
  });

  it("returns null when the plugin throws (e.g. dialog not available)", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockRejectedValue(new Error("dialog unavailable"));
    const result = await pickFolder();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickFile
// ---------------------------------------------------------------------------

describe("pickFile", () => {
  it("returns null outside Tauri", async () => {
    isTauriMock.mockReturnValue(false);
    expect(await pickFile()).toBeNull();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("returns the chosen file path", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/home/user/file.txt");
    expect(await pickFile()).toBe("/home/user/file.txt");
  });

  it("passes directory:false and multiple:false", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/file.txt");
    await pickFile();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ directory: false, multiple: false }),
    );
  });

  it("returns null on cancel (null result)", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(null);
    expect(await pickFile()).toBeNull();
  });

  it("returns null on array result", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(["/a.txt"]);
    expect(await pickFile()).toBeNull();
  });

  it("returns null when plugin throws", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockRejectedValue(new Error("boom"));
    expect(await pickFile()).toBeNull();
  });

  it("passes defaultPath when provided", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/chosen.txt");
    await pickFile("/default/dir");
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "/default/dir" }));
  });
});

// ---------------------------------------------------------------------------
// pickFontFile
// ---------------------------------------------------------------------------

describe("pickFontFile", () => {
  it("returns null outside Tauri", async () => {
    isTauriMock.mockReturnValue(false);
    expect(await pickFontFile()).toBeNull();
  });

  it("returns chosen font path", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/fonts/my-font.ttf");
    expect(await pickFontFile()).toBe("/fonts/my-font.ttf");
  });

  it("includes font extension filter with ttf, otf, woff2, woff", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/fonts/font.woff2");
    await pickFontFile();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          expect.objectContaining({
            name: "Font",
            extensions: expect.arrayContaining(["ttf", "otf", "woff2", "woff"]),
          }),
        ],
      }),
    );
  });

  it("returns null when user cancels", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(null);
    expect(await pickFontFile()).toBeNull();
  });

  it("returns null when plugin throws", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockRejectedValue(new Error("dialog error"));
    expect(await pickFontFile()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickImageFile
// ---------------------------------------------------------------------------

describe("pickImageFile", () => {
  it("returns null outside Tauri", async () => {
    isTauriMock.mockReturnValue(false);
    expect(await pickImageFile()).toBeNull();
  });

  it("returns chosen image path", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/images/logo.png");
    expect(await pickImageFile()).toBe("/images/logo.png");
  });

  it("includes image extension filter with svg, png, webp, jpg, jpeg, gif", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/images/logo.svg");
    await pickImageFile();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          expect.objectContaining({
            name: "Image",
            extensions: expect.arrayContaining(["svg", "png", "webp", "jpg", "jpeg", "gif"]),
          }),
        ],
      }),
    );
  });

  it("returns null when user cancels", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue(null);
    expect(await pickImageFile()).toBeNull();
  });

  it("returns null when plugin throws", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockRejectedValue(new Error("no dialog"));
    expect(await pickImageFile()).toBeNull();
  });

  it("passes defaultPath through when provided", async () => {
    isTauriMock.mockReturnValue(true);
    mockOpen.mockResolvedValue("/images/avatar.webp");
    await pickImageFile("/default");
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "/default" }));
  });
});
