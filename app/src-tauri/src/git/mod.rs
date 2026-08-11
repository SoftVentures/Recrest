use std::path::Path;

pub mod author_normalize;
pub mod branches;
pub mod logo;
pub mod reconcile;
pub mod scanner;
pub mod status;
pub mod watcher;

/// Whether a registered repository is still usable at `path`.
///
/// Defined as "a `.git` entry is there" rather than "the directory is there":
/// a folder that survived but lost its `.git` is just as unusable to every
/// caller. Keeping a single definition is what stops `RepoDto::missing`, the
/// reconciler's sweep and the watcher's removal path from disagreeing about the
/// same repo — they previously used two different checks.
pub fn is_repo_present(path: &Path) -> bool {
    path.join(".git").exists()
}
