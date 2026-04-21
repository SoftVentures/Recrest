import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LangDot } from "@/components/atoms/LangDot";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

function renderDot(lang: string | null | undefined) {
  return render(
    <TooltipProvider>
      <LangDot lang={lang} />
    </TooltipProvider>,
  );
}

describe("LangDot", () => {
  it("rendert mit lang-dot Klasse", () => {
    const { container } = renderDot("rs");
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("rendert bei null-lang (Fallback)", () => {
    const { container } = renderDot(null);
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("rendert bei undefined-lang (Fallback)", () => {
    const { container } = renderDot(undefined);
    expect(container.querySelector(".lang-dot")).not.toBeNull();
  });

  it("hat ein aria-label mit Sprachenbezeichnung", () => {
    const { container } = renderDot("Rust");
    expect(container.querySelector(".lang-dot")?.getAttribute("aria-label")).toBeTruthy();
  });

  it("setzt background-style aus langMeta", () => {
    const { container } = renderDot("Rust");
    const dot = container.querySelector<HTMLSpanElement>(".lang-dot");
    expect(dot?.style.background).not.toBe("");
  });
});
