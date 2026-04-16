import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom has no Tauri runtime — stub the IPC surface so slices importing
// `@/lib/tauri` (and transitively `@tauri-apps/api/core`) don't throw at import.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
}));
