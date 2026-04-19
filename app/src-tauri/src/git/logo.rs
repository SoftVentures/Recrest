use std::path::{Path, PathBuf};

/// Maximum image size we'll ship across IPC. Protects the renderer from a
/// multi-megabyte screenshot sitting in a repo root — it gets skipped.
pub const MAX_LOGO_BYTES: u64 = 2 * 1024 * 1024;

/// Directories inside a repo that may contain a logo, in priority order.
/// Earlier entries win on ties. Covers the typical web / monorepo layouts.
const SEARCH_DIRS: &[&str] = &[
    "",
    "assets",
    "public",
    "public/favicon",
    "public/favicons",
    "public/icons",
    "public/images",
    "public/img",
    "static",
    "static/favicon",
    "static/icons",
    "static/images",
    ".github",
    ".github/images",
    ".github/assets",
    "docs",
    "docs/assets",
    "docs/images",
    "docs/img",
    "src/assets",
    "src/images",
    "src/img",
    "app/public",
    "app/public/favicon",
    "app/src/assets",
    "client/public",
    "client/src/assets",
    "web/public",
    "web/src/assets",
    "frontend/public",
    "frontend/src/assets",
    "website/public",
    "website/static",
    "site/static",
];

/// Accepted base filenames (case-insensitive). `favicon` is included because
/// practically every web project ships one — it's a reasonable last resort
/// when no explicit `logo.*` exists.
const LIGHT_NAMES: &[&str] = &[
    "logo",
    "logo-light",
    "logo_light",
    "light-logo",
    "brand",
    "brandmark",
    "mark",
    "icon",
    "app-icon",
    "appicon",
    "favicon",
    "favicon-32x32",
    "favicon-96x96",
    "favicon-192x192",
    "apple-touch-icon",
];
const DARK_NAMES: &[&str] = &["logo-dark", "logo_dark", "dark-logo", "logo.dark"];

/// Image extensions, ordered from most preferred (scalable/lossless) to least.
/// `.ico` intentionally ranks low so a proper `logo.png` wins over a browser
/// favicon, but still beats "no logo at all".
const EXTENSIONS: &[&str] = &["svg", "png", "webp", "jpg", "jpeg", "ico", "gif"];

/// Resolved logo pair: either/both may be present.
#[derive(Debug, Clone, Default)]
pub struct RepoLogoPaths {
    pub light: Option<PathBuf>,
    pub dark: Option<PathBuf>,
}

/// Walks a small set of well-known directories inside a repo and picks the
/// best logo file for the light and dark themes.
///
/// One `read_dir` per search directory — the expected cost is well under a
/// millisecond per repo since most directories don't exist. Scoring prefers
/// earlier directory entries, earlier name entries, and earlier extensions,
/// so deterministic "best fit" comes out of a single pass.
pub fn detect_repo_logo(repo_path: &Path) -> RepoLogoPaths {
    RepoLogoPaths {
        light: best_match(repo_path, LIGHT_NAMES),
        dark: best_match(repo_path, DARK_NAMES),
    }
}

fn best_match(repo_path: &Path, names: &[&str]) -> Option<PathBuf> {
    let mut best: Option<(Score, PathBuf)> = None;

    for (dir_idx, dir) in SEARCH_DIRS.iter().enumerate() {
        let base = if dir.is_empty() {
            repo_path.to_path_buf()
        } else {
            repo_path.join(dir)
        };
        let Ok(entries) = std::fs::read_dir(&base) else { continue };

        for entry in entries.flatten() {
            let Ok(ft) = entry.file_type() else { continue };
            if !ft.is_file() {
                continue;
            }
            let file_name = entry.file_name();
            let Some(fname) = file_name.to_str() else { continue };
            let Some((stem, ext)) = split_stem_ext(fname) else { continue };

            let Some(name_idx) = names.iter().position(|n| n.eq_ignore_ascii_case(&stem)) else {
                continue;
            };
            let Some(ext_idx) = EXTENSIONS.iter().position(|e| e.eq_ignore_ascii_case(&ext)) else {
                continue;
            };

            let path = entry.path();
            if !is_reasonable_size(&entry) {
                continue;
            }

            let score = Score {
                dir_idx,
                name_idx,
                ext_idx,
            };
            match &best {
                Some((cur, _)) if cur.better_than(&score) => {}
                _ => best = Some((score, path)),
            }
        }

        // Tiny optimisation: if we already have the absolute best possible
        // combination for this directory (first name + first ext), stop
        // scanning further directories since they can only match with a
        // worse `dir_idx`.
        if let Some((s, _)) = &best {
            if s.dir_idx == dir_idx && s.name_idx == 0 && s.ext_idx == 0 {
                break;
            }
        }
    }

    best.map(|(_, p)| p)
}

#[derive(Debug, Clone, Copy)]
struct Score {
    dir_idx: usize,
    name_idx: usize,
    ext_idx: usize,
}

impl Score {
    /// Lower indexes are better. Directories weigh more than names, names
    /// more than extensions — so a `logo.png` in the root beats a
    /// `favicon.svg` two folders deep.
    fn better_than(&self, other: &Score) -> bool {
        let me = (self.dir_idx, self.name_idx, self.ext_idx);
        let them = (other.dir_idx, other.name_idx, other.ext_idx);
        me < them
    }
}

fn split_stem_ext(name: &str) -> Option<(String, String)> {
    let dot = name.rfind('.')?;
    if dot == 0 {
        return None; // dotfile like `.gitignore`
    }
    let stem = name[..dot].to_ascii_lowercase();
    let ext = name[dot + 1..].to_ascii_lowercase();
    if stem.is_empty() || ext.is_empty() {
        return None;
    }
    Some((stem, ext))
}

fn is_reasonable_size(entry: &std::fs::DirEntry) -> bool {
    match entry.metadata() {
        Ok(m) => m.len() > 0 && m.len() <= MAX_LOGO_BYTES,
        Err(_) => false,
    }
}

/// Mime-type from the extension (lowercase). Falls back to octet-stream.
pub fn mime_from_path(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "webp" => "image/webp",
        "jpg" | "jpeg" => "image/jpeg",
        "ico" => "image/x-icon",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }
}
