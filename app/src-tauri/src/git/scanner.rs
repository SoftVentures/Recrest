use std::path::{Path, PathBuf};

use walkdir::WalkDir;

#[derive(Debug, Clone)]
pub struct ScanOptions {
    pub max_depth: usize,
    pub follow_links: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self { max_depth: 6, follow_links: false }
    }
}

/// Recursively scan `root` for directories containing a `.git` entry.
/// Returns the *repository* directories (parents of `.git`), not `.git` itself.
pub fn scan(root: &Path, options: &ScanOptions) -> Vec<PathBuf> {
    let mut found = Vec::new();
    if !root.exists() {
        return found;
    }

    let mut iter = WalkDir::new(root)
        .max_depth(options.max_depth)
        .follow_links(options.follow_links)
        .into_iter();

    while let Some(entry) = iter.next() {
        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_dir() {
            continue;
        }
        let is_repo = entry.path().join(".git").exists();
        if is_repo {
            found.push(entry.path().to_path_buf());
            // Do not descend into a discovered repo.
            iter.skip_current_dir();
        }
    }

    found.sort();
    found.dedup();
    found
}

pub fn scan_many(roots: &[String], options: &ScanOptions) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut all = Vec::new();
    for root in roots {
        all.extend(scan(Path::new(root), options));
    }
    all.sort();
    all.dedup();
    Ok(all)
}
