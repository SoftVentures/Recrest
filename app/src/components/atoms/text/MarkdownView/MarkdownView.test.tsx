import { describe, expect, it } from "vitest";

import MarkdownView from "@/components/atoms/text/MarkdownView";
import { renderWithProviders } from "@/test/utils";

/**
 * XSS regression suite for the markdown renderer. The pipeline is
 * `remark-gfm → rehype-raw → rehype-sanitize(SCHEMA)` and any of these
 * vectors slipping through would indicate the sanitize step regressed.
 */
describe("MarkdownView XSS hardening", () => {
  it("strips <script> tags entirely", () => {
    const src = "before<script>window.__xss__ = true</script>after";
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __xss__?: boolean }).__xss__).toBeUndefined();
  });

  it("drops onerror handlers from <img> tags", () => {
    const src = '<img src="x" onerror="window.__xss__=true" />';
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    const img = container.querySelector("img");
    // The img element survives (it's on the allowlist) but the event
    // handler must not.
    expect(img?.getAttribute("onerror")).toBeNull();
    expect((window as unknown as { __xss__?: boolean }).__xss__).toBeUndefined();
  });

  it("blocks javascript: URLs in links", () => {
    const src = "[click me](javascript:alert(1))";
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    const a = container.querySelector("a");
    // The anchor is rendered but the unsafe href is stripped (or the
    // element is removed entirely). Either is acceptable; what we ban is
    // an `href` still pointing at the javascript: scheme.
    if (a) expect(a.getAttribute("href")?.startsWith("javascript:")).toBeFalsy();
  });

  it("strips inline style attributes", () => {
    const src = '<p style="background: url(javascript:alert(1))">x</p>';
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    expect(container.querySelector("p")?.getAttribute("style")).toBeNull();
  });

  it("strips iframes", () => {
    const src = '<iframe src="https://evil.example/"></iframe>';
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders safe <details>/<summary> (allowlisted) intact", () => {
    const src = "<details><summary>hi</summary>body</details>";
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")).not.toBeNull();
  });

  it("renders GFM tables correctly without HTML injection", () => {
    const src = `| A | B |\n| --- | --- |\n| 1 | 2 |`;
    const { container } = renderWithProviders(<MarkdownView source={src} />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("td").length).toBe(2);
  });
});
