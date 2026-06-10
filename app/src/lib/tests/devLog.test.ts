import { describe, expect, it } from "vitest";

import { safeStringify } from "@/lib/devLog";

describe("safeStringify", () => {
  it("returns plain strings untouched", () => {
    expect(safeStringify("hello")).toBe("hello");
  });

  it("renders an Error as name + message + stack, not a deep object", () => {
    const out = safeStringify(new Error("boom"));
    expect(out.startsWith("Error: boom")).toBe(true);
    expect(out).not.toContain("[Circular]");
  });

  it("never serialises a DOM node into its React fiber tree", () => {
    // React hangs `__reactFiber$…` expandos off real DOM nodes; following them
    // serialises the whole tree (the 1.5 GB log bug). A node must collapse to a
    // short tag instead.
    const el = document.createElement("div");
    el.className = "drag-target";
    // Simulate React's expando linking back to a huge circular structure.
    const fakeFiber: Record<string, unknown> = { stateNode: el, memoizedProps: {} };
    fakeFiber.return = fakeFiber;
    (el as unknown as Record<string, unknown>).__reactFiber$abc = fakeFiber;

    const out = safeStringify(el);
    expect(out).toBe("[DIV]");
    expect(out).not.toContain("stateNode");
    expect(out).not.toContain("__react");
  });

  it("does not recurse into a DOM node nested inside a plain object", () => {
    const el = document.createElement("span");
    (el as unknown as Record<string, unknown>).__reactProps$xyz = { huge: "x".repeat(50_000) };
    const out = safeStringify({ label: "warn", target: el });
    expect(out).toContain('"label": "warn"');
    expect(out).toContain("[SPAN]");
    expect(out.length).toBeLessThan(1_000);
  });

  it("tags React-element-like and fiber-like objects without recursing", () => {
    const element = { $$typeof: Symbol.for("react.element"), type: "div", props: {} };
    expect(safeStringify(element)).toBe("[ReactElement]");

    const fiber: Record<string, unknown> = { stateNode: {}, child: {}, _debugHookTypes: [] };
    fiber.return = fiber;
    expect(safeStringify({ node: fiber })).toContain("[ReactFiber]");
  });

  it("handles circular plain objects", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    const out = safeStringify(a);
    expect(out).toContain('"name": "a"');
    expect(out).toContain("[Circular]");
  });

  it("caps a pathologically large object instead of emitting megabytes", () => {
    const big = { blob: "x".repeat(100_000) };
    const out = safeStringify(big);
    expect(out.length).toBeLessThan(9_000);
    expect(out).toContain("truncated");
  });
});
