use std::path::{Path, PathBuf};

use walkdir::WalkDir;

#[derive(Debug, Clone)]
pub struct ScanOptions {
    pub max_depth: usize,
    pub follow_links: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            max_depth: 6,
            follow_links: false,
        }
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

/// What a scan sweep discovered, plus which roots it can actually vouch for.
///
/// The split exists because "no repos found under `E:\repos`" and "`E:\repos`
/// was never readable" are the same empty vector but opposite facts. Callers
/// that delete records on absence (`prune_orphan_scanned_repos`) must only ever
/// act on the roots in `walked_roots`.
#[derive(Debug, Clone, Default)]
pub struct ScanOutcome {
    /// Repository directories (parents of `.git`), sorted and deduped.
    pub repos: Vec<PathBuf>,
    /// Roots that existed **and** whose walk produced no errors, in
    /// `normalize_scan_root` form so prefix comparisons match the paths the
    /// walker emitted.
    pub walked_roots: Vec<PathBuf>,
}

/// Recursively scan `root` for directories containing a `.git` entry, yielding
/// the *repository* directories (parents of `.git`), not `.git` itself. The
/// `bool` is `true` only when the walk is trustworthy enough to conclude that a
/// registered repo *not* in the result is really gone — i.e. the root existed
/// and every entry was readable.
fn scan_root(root: &Path, options: &ScanOptions) -> (Vec<PathBuf>, bool) {
    let mut found = Vec::new();
    let root = normalize_scan_root(root);
    if !root.exists() {
        // Unplugged external drive, unmounted share, or a momentary SMB
        // dropout — `Path::exists` reports all three as `false`. Absence of
        // results here proves nothing about the repos below it.
        return (found, false);
    }

    let mut walked_cleanly = true;
    let mut iter = WalkDir::new(&root)
        .max_depth(options.max_depth)
        .follow_links(options.follow_links)
        .into_iter();

    while let Some(entry) = iter.next() {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                // A permission-denied or mid-walk-vanished subtree means part
                // of this root was never inspected, so the result set is
                // incomplete and must not be read as proof of deletion.
                tracing::debug!("scan: walk error under {}: {err}", root.display());
                walked_cleanly = false;
                continue;
            }
        };
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
    (found, walked_cleanly)
}

pub fn scan_many(roots: &[String], options: &ScanOptions) -> Result<ScanOutcome, std::io::Error> {
    let mut repos = Vec::new();
    let mut walked_roots = Vec::new();
    for root in roots {
        let root = Path::new(root);
        let (found, walked_cleanly) = scan_root(root, options);
        repos.extend(found);
        if walked_cleanly {
            walked_roots.push(normalize_scan_root(root));
        }
    }
    repos.sort();
    repos.dedup();
    walked_roots.sort();
    walked_roots.dedup();
    Ok(ScanOutcome {
        repos,
        walked_roots,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn init_repo(path: &Path) {
        std::fs::create_dir_all(path.join(".git")).expect("create .git");
    }

    #[test]
    fn scan_many_reports_a_readable_root_as_walked() {
        let root = tempfile::tempdir().expect("tmpdir");
        init_repo(&root.path().join("alpha"));

        let outcome = scan_many(
            &[root.path().to_string_lossy().to_string()],
            &ScanOptions::default(),
        )
        .expect("scan");

        assert_eq!(outcome.repos, vec![root.path().join("alpha")]);
        assert_eq!(
            outcome.walked_roots,
            vec![normalize_scan_root(root.path())],
            "an existing, cleanly walked root must be vouched for"
        );
    }

    /// The unplugged-drive case: an empty repo list must not be mistaken for
    /// "every repo under this root was deleted".
    #[test]
    fn scan_many_never_vouches_for_an_unreachable_root() {
        let root = tempfile::tempdir().expect("tmpdir");
        let unreachable = root.path().join("never-created");

        let outcome = scan_many(
            &[unreachable.to_string_lossy().to_string()],
            &ScanOptions::default(),
        )
        .expect("scan");

        assert!(outcome.repos.is_empty());
        assert!(
            outcome.walked_roots.is_empty(),
            "a root that does not exist was not walked"
        );
    }

    #[test]
    fn scan_many_vouches_only_for_the_reachable_root() {
        let reachable = tempfile::tempdir().expect("tmpdir");
        init_repo(&reachable.path().join("alpha"));
        let holder = tempfile::tempdir().expect("tmpdir2");
        let unreachable = holder.path().join("never-created");

        let outcome = scan_many(
            &[
                reachable.path().to_string_lossy().to_string(),
                unreachable.to_string_lossy().to_string(),
            ],
            &ScanOptions::default(),
        )
        .expect("scan");

        assert_eq!(
            outcome.walked_roots,
            vec![normalize_scan_root(reachable.path())]
        );
    }
}
