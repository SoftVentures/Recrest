import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export interface AxeScanResult {
  violations: Array<{
    id: string;
    impact: "minor" | "moderate" | "serious" | "critical" | null;
    help: string;
    nodes: number;
    targets: string[];
    failures: string[];
  }>;
  blocking: number;
}

/**
 * Run an axe-core scan constrained to WCAG 2.1 AA. Returns a condensed summary
 * plus a `blocking` count (critical + serious) suitable for `expect(x).toBe(0)`.
 * Pass a CSS selector to `root` to scope the scan to one section.
 */
export async function scanA11y(
  page: Page,
  root?: string,
  disableRules: string[] = [],
): Promise<AxeScanResult> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (disableRules.length > 0) builder = builder.disableRules(disableRules);
  const results = root ? await builder.include(root).analyze() : await builder.analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact as AxeScanResult["violations"][number]["impact"],
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes
      .slice(0, 10)
      .map((n) => (Array.isArray(n.target) ? n.target.join(" ") : String(n.target))),
    failures: v.nodes.slice(0, 5).map((n) => n.failureSummary ?? ""),
  }));
  const blocking = violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious" || v.impact === "moderate",
  ).length;
  return { violations, blocking };
}
