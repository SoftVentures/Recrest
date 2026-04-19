import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LangDot } from "@/components/atoms/LangDot";

describe("LangDot", () => {
  it("rendert mit lang-dot Klasse", () => {
    const { container } = render(<LangDot lang="rs" />);
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("rendert bei null-lang (Fallback)", () => {
    const { container } = render(<LangDot lang={null} />);
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("rendert bei undefined-lang (Fallback)", () => {
    const { container } = render(<LangDot lang={undefined} />);
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("hat ein title-Attribut mit Sprachenbezeichnung", () => {
    const { container } = render(<LangDot lang="Rust" />);
    expect(container.querySelector(".lang-dot")?.getAttribute("title")).toBeTruthy();
  });

  it("setzt background-style aus langMeta", () => {
    const { container } = render(<LangDot lang="Rust" />);
    const dot = container.querySelector<HTMLSpanElement>(".lang-dot");
    expect(dot?.style.background).not.toBe("");
  });
});
