//! Test-only helpers shared across Phase 3 backend tests.
#![cfg(test)]

use std::path::Path;

use git2::{Repository, Signature};
use tempfile::TempDir;

/// A throwaway git repo in a `TempDir`. Drop deletes everything.
pub struct TempRepo {
    pub dir: TempDir,
    pub repo: Repository,
}

impl TempRepo {
    /// Init an empty repo with a deterministic signature configured locally.
    pub fn init() -> Self {
        let dir = TempDir::new().expect("tempdir");
        let repo = Repository::init(dir.path()).expect("git init");
        {
            let mut cfg = repo.config().expect("config");
            cfg.set_str("user.name", "Test User").expect("set name");
            cfg.set_str("user.email", "test@example.invalid")
                .expect("set email");
        }
        Self { dir, repo }
    }

    /// Write `content` to `rel` (relative to repo root), creating parent dirs.
    pub fn write_file(&self, rel: &str, content: &str) {
        let p = self.dir.path().join(rel);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent).expect("mkdir");
        }
        std::fs::write(p, content).expect("write");
    }

    /// Stage `rel` and commit it, returning the new commit oid.
    pub fn commit_file(&self, rel: &str, content: &str, message: &str) -> git2::Oid {
        self.write_file(rel, content);
        let mut index = self.repo.index().expect("index");
        index.add_path(Path::new(rel)).expect("add");
        index.write().expect("write index");
        let tree_oid = index.write_tree().expect("write tree");
        let tree = self.repo.find_tree(tree_oid).expect("find tree");
        let sig = Signature::now("Test User", "test@example.invalid").expect("sig");
        let parents = match self.repo.head().ok().and_then(|h| h.target()) {
            Some(oid) => vec![self.repo.find_commit(oid).expect("parent")],
            None => vec![],
        };
        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
        self.repo
            .commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
            .expect("commit")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temp_repo_commits_and_reports_head() {
        let tr = TempRepo::init();
        assert!(tr.repo.head().is_err(), "fresh repo has no HEAD yet");
        tr.commit_file("README.md", "hi", "initial");
        let head = tr.repo.head().expect("head after commit");
        assert!(head.target().is_some());
    }
}
