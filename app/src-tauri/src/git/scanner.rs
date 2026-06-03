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

/// Normalises a user-supplied scan root. On Windows, a bare drive
/// specifier like `"D:"` refers to the *current working directory* of
/// drive D, not the drive root — users typing `D:` into the scan-path
/// input expect drive-root scanning, so we append the separator to
/// produce `D:\`. Other forms (`D:\`, `D:/`, regular paths) are left
/// untouched. No-op on non-Windows targets.
///
/// Public so repo-pruning (`forget_repos_under_path`) normalises a removed
/// scan root exactly the way discovery did, otherwise a path stored as `D:`
/// would never prefix-match the `D:\…` repo paths the walker produced.
pub fn normalize_scan_root(root: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        let s = root.as_os_str().to_string_lossy();
        if s.len() == 2 && s.ends_with(':') {
            let mut bytes = s.into_owned();
            bytes.push('\\');
            return PathBuf::from(bytes);
        }
    }
    root.to_path_buf()
}

/// Recursively scan `root` for directories containing a `.git` entry.
/// Returns the *repository* directories (parents of `.git`), not `.git` itself.
pub fn scan(root: &Path, options: &ScanOptions) -> Vec<PathBuf> {
    let mut found = Vec::new();
    let root = normalize_scan_root(root);
    if !root.exists() {
        return found;
    }

    let mut iter = WalkDir::new(&root)
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
