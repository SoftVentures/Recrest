//! Plan 03/04 C.5 — Unified-diff hunk parser shared by GitHub + GitLab.
//!
//! Both providers hand us a `patch`/`diff` string that contains zero-or-more
//! hunk blocks per file (the file-level wrapper differs). Bitbucket returns
//! the whole PR as one combined-diff blob and uses the `unidiff` crate
//! instead; this module only handles single-file hunk strings.
//!
//! Hunk header grammar (`man diff`):
//! ```text
//! @@ -<old_start>[,<old_lines>] +<new_start>[,<new_lines>] @@ [optional trailing context]
//! ```
//! Lines inside a hunk are tagged:
//! - ` ` → context (present in both sides)
//! - `+` → added (only in new side)
//! - `-` → removed (only in old side)
//! - `\` → "No newline at end of file" marker (skipped; doesn't move counters)
//!
//! Anything before the first `@@` (e.g. binary-file warnings, `--- a/...` /
//! `+++ b/...` file headers when present) is ignored — the per-provider call
//! site only forwards hunk text; even if file headers slip through they
//! match the leading-`@@` filter and never affect counters.

use crate::providers::api::{DiffHunk, DiffLine, DiffLineKind};

/// Parses a single file's hunk block(s) into `DiffHunk` records. An empty
/// input (or one with no `@@` header) yields an empty vec — callers can
/// safely chain this onto every file without branching.
pub fn parse_hunks(patch: &str) -> Vec<DiffHunk> {
    let mut hunks: Vec<DiffHunk> = Vec::new();
    let mut current: Option<DiffHunk> = None;
    // Track the current line counters per side so callers can map each
    // `DiffLine` back to a specific source line without a second pass.
    let mut old_line = 0_u32;
    let mut new_line = 0_u32;

    for raw in patch.lines() {
        if let Some(header) = parse_header(raw) {
            // Push the previous hunk (if any) and reset counters from the
            // new header.
            if let Some(h) = current.take() {
                hunks.push(h);
            }
            old_line = header.old_start;
            new_line = header.new_start;
            current = Some(DiffHunk {
                old_start: header.old_start,
                old_lines: header.old_lines,
                new_start: header.new_start,
                new_lines: header.new_lines,
                lines: Vec::new(),
            });
            continue;
        }

        let Some(hunk) = current.as_mut() else {
            continue; // header-less prelude — skip until we see the first @@
        };

        // `\ No newline at end of file` markers don't carry source lines.
        if raw.starts_with('\\') {
            continue;
        }

        let (kind, content) = match raw.as_bytes().first() {
            Some(b'+') => (DiffLineKind::Add, &raw[1..]),
            Some(b'-') => (DiffLineKind::Remove, &raw[1..]),
            // Treat a bare empty line as context — GitHub strips the leading
            // space on otherwise-empty context lines occasionally.
            Some(b' ') => (DiffLineKind::Context, &raw[1..]),
            None => (DiffLineKind::Context, ""),
            _ => continue,
        };

        let (old_no, new_no) = match kind {
            DiffLineKind::Context => {
                let pair = (Some(old_line), Some(new_line));
                old_line += 1;
                new_line += 1;
                pair
            }
            DiffLineKind::Add => {
                let pair = (None, Some(new_line));
                new_line += 1;
                pair
            }
            DiffLineKind::Remove => {
                let pair = (Some(old_line), None);
                old_line += 1;
                pair
            }
        };

        hunk.lines.push(DiffLine {
            kind,
            content: content.to_string(),
            old_line_no: old_no,
            new_line_no: new_no,
        });
    }

    if let Some(h) = current.take() {
        hunks.push(h);
    }
    hunks
}

struct Header {
    old_start: u32,
    old_lines: u32,
    new_start: u32,
    new_lines: u32,
}

/// `@@ -123,4 +123,7 @@ optional trailing context` → `Header`. The
/// `,<count>` is optional and defaults to 1 (per the unified-diff spec).
fn parse_header(line: &str) -> Option<Header> {
    let line = line.strip_prefix("@@ ")?;
    // Split at the closing ` @@` to drop the optional trailing context.
    let inner = line.split_once(" @@").map(|(a, _)| a).unwrap_or(line);
    let mut parts = inner.split_whitespace();
    let old = parts.next()?.strip_prefix('-')?;
    let new = parts.next()?.strip_prefix('+')?;
    let (old_start, old_lines) = parse_range(old)?;
    let (new_start, new_lines) = parse_range(new)?;
    Some(Header {
        old_start,
        old_lines,
        new_start,
        new_lines,
    })
}

fn parse_range(s: &str) -> Option<(u32, u32)> {
    if let Some((start, count)) = s.split_once(',') {
        Some((start.parse().ok()?, count.parse().ok()?))
    } else {
        Some((s.parse().ok()?, 1))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_yields_no_hunks() {
        assert!(parse_hunks("").is_empty());
        assert!(parse_hunks("no @@ markers here\n").is_empty());
    }

    #[test]
    fn single_hunk_context_add_remove() {
        let patch = "@@ -1,3 +1,4 @@\n a\n-b\n+B\n+B2\n c\n";
        let hunks = parse_hunks(patch);
        assert_eq!(hunks.len(), 1);
        let h = &hunks[0];
        assert_eq!(h.old_start, 1);
        assert_eq!(h.old_lines, 3);
        assert_eq!(h.new_start, 1);
        assert_eq!(h.new_lines, 4);
        // 5 lines total: a (ctx), -b, +B, +B2, c (ctx)
        let kinds: Vec<DiffLineKind> = h.lines.iter().map(|l| l.kind).collect();
        assert_eq!(
            kinds,
            vec![
                DiffLineKind::Context,
                DiffLineKind::Remove,
                DiffLineKind::Add,
                DiffLineKind::Add,
                DiffLineKind::Context,
            ]
        );
        // Line counters: context lines advance both sides; add advances new
        // only; remove advances old only.
        assert_eq!(h.lines[0].old_line_no, Some(1));
        assert_eq!(h.lines[0].new_line_no, Some(1));
        assert_eq!(h.lines[1].old_line_no, Some(2));
        assert_eq!(h.lines[1].new_line_no, None);
        assert_eq!(h.lines[2].old_line_no, None);
        assert_eq!(h.lines[2].new_line_no, Some(2));
        assert_eq!(h.lines[3].old_line_no, None);
        assert_eq!(h.lines[3].new_line_no, Some(3));
        assert_eq!(h.lines[4].old_line_no, Some(3));
        assert_eq!(h.lines[4].new_line_no, Some(4));
    }

    #[test]
    fn multiple_hunks_split_correctly() {
        let patch = "\
@@ -1,1 +1,1 @@
-old
+new
@@ -10,1 +11,1 @@ trailing context
-x
+y
";
        let hunks = parse_hunks(patch);
        assert_eq!(hunks.len(), 2);
        assert_eq!(hunks[0].old_start, 1);
        assert_eq!(hunks[1].old_start, 10);
        assert_eq!(hunks[1].new_start, 11);
    }

    #[test]
    fn single_line_range_defaults_count_to_one() {
        // `@@ -5 +5 @@` (no `,<n>`) is valid per the spec.
        let hunks = parse_hunks("@@ -5 +5 @@\n a\n");
        assert_eq!(hunks.len(), 1);
        assert_eq!(hunks[0].old_lines, 1);
        assert_eq!(hunks[0].new_lines, 1);
    }

    #[test]
    fn no_newline_marker_is_skipped() {
        let patch = "@@ -1,1 +1,1 @@\n-a\n\\ No newline at end of file\n+b\n";
        let hunks = parse_hunks(patch);
        assert_eq!(hunks.len(), 1);
        assert_eq!(hunks[0].lines.len(), 2);
        assert_eq!(hunks[0].lines[0].kind, DiffLineKind::Remove);
        assert_eq!(hunks[0].lines[1].kind, DiffLineKind::Add);
    }
}
