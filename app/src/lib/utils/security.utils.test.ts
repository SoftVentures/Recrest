import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/lib/utils/security.utils";

/**
 * Belt-and-braces DOMPurify wrapper. The library is well-trusted; what this
 * suite locks down is our schema configuration — additions to ALLOWED_TAGS
 * or removals from FORBID_ATTR would break these expectations immediately.
 */
describe("sanitizeHtml", () => {
  it("strips <script> tags", () => {
    expect(sanitizeHtml("<p>ok</p><script>alert(1)</script>")).not.toContain("script");
  });

  it("strips inline event handlers from allowed tags", () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)" />');
    expect(out).not.toContain("onerror");
  });

  it("removes style attributes (no CSS-expression / url(javascript:) vectors)", () => {
    const out = sanitizeHtml('<p style="background:url(javascript:alert(1))">x</p>');
    expect(out).not.toContain("style=");
  });

  it("drops <iframe> entirely", () => {
    expect(sanitizeHtml('<iframe src="https://evil.example/"></iframe>')).not.toContain("iframe");
  });

  it("blocks javascript: URLs in links", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/href=["']?javascript:/i);
  });

  it("preserves allowlisted tags like <details>/<summary>", () => {
    const out = sanitizeHtml("<details><summary>hi</summary>body</details>");
    expect(out).toContain("<details>");
    expect(out).toContain("<summary>");
  });

  it("preserves safe links + their text", () => {
    const out = sanitizeHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain(">x<");
  });
});
