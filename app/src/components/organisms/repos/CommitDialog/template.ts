/** Render `{{author}}` / `{{date}}` placeholders in the user's commit
 *  template using the configured git config override (or sensible
 *  fallbacks). Pure so the dialog stays a single-export module — keeps
 *  React Fast Refresh happy and the helper unit-testable on its own. */
export function renderCommitTemplate(
  template: string,
  ctx: { author: string; date: string },
): string {
  return template
    .replace(/\{\{\s*author\s*\}\}/g, ctx.author)
    .replace(/\{\{\s*date\s*\}\}/g, ctx.date);
}
