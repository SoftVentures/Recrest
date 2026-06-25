import { describe, expect, it } from "vitest";

import { errorMessage } from "@/lib/utils/error.utils";

describe("errorMessage", () => {
  it("reads a native Error's message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a plain string as-is", () => {
    expect(errorMessage("tauri-ipc-unavailable")).toBe("tauri-ipc-unavailable");
  });

  it("reads the message off a Tauri CommandError ({ kind, message })", () => {
    expect(errorMessage({ kind: "internal", message: "failed to move to trash: locked" })).toBe(
      "failed to move to trash: locked",
    );
  });

  it("reads the message off an RTK SerializedError ({ message })", () => {
    expect(errorMessage({ message: "rejected" })).toBe("rejected");
  });

  it("falls back to String() for objects without a usable message", () => {
    // The pre-fix bug surfaced this as the toast text — kept as last resort only
    // for genuinely shapeless values, never for the CommandError/SerializedError
    // cases above.
    expect(errorMessage({ kind: "weird" })).toBe("[object Object]");
  });

  it("falls back to String() for primitives", () => {
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage(null)).toBe("null");
  });
});
