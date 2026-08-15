//! How this copy of Recrest was installed — and whether it is allowed to
//! replace itself.
//!
//! Debian, Fedora, Arch, Flathub and the Snap Store all expect a
//! package-managed binary **not** to self-update: an in-place replacement
//! diverges the package database from the filesystem, and on a root-owned
//! prefix it fails on permissions anyway. So before the updater offers an
//! "Install" action we classify the installation and gate on the result.
//!
//! The classification is a pure function over (target OS, executable path,
//! environment, `/.flatpak-info` presence) so every branch is unit-testable
//! without an actual Debian or Arch box. [`current_channel`] is the thin
//! wrapper that reads the real environment.
//!
//! Signals, in the order they are trusted:
//!
//! * **Flatpak** — `/.flatpak-info` exists inside the sandbox, and
//!   `FLATPAK_ID` is exported to the app.
//! * **Snap** — `SNAP` points at the mounted revision directory.
//! * **AppImage** — the AppImage runtime exports `APPIMAGE` (path to the
//!   image) and `APPDIR` (the mounted squashfs root). `APPIMAGE` is conclusive
//!   on its own; `APPDIR` only counts when the executable really lives under
//!   it, because the name is generic enough for unrelated tooling to export
//!   it. This is the one Linux layout `tauri-plugin-updater` can actually
//!   update in place.
//! * **Distro package** — the executable resolves into a prefix owned by a
//!   package manager (`/usr/bin`, `/opt`, `/nix/store`, …) and none of the
//!   above matched.
//!
//! macOS and Windows stay self-updating: neither has a distro package manager
//! in the loop, and the formats that do wrap them (Homebrew Cask, winget,
//! Scoop) install the very same `.app`/NSIS bundle the updater knows how to
//! replace — they track versions loosely and tolerate an app updating itself.
//! Container/distro channels are Linux-only concepts, which is why the
//! non-Linux arm never needs the executable path at all.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::Serialize;

/// Set by the AppImage runtime to the path of the image itself.
const ENV_APPIMAGE: &str = "APPIMAGE";
/// Set by the AppImage runtime to the mounted squashfs root.
const ENV_APPDIR: &str = "APPDIR";
const ENV_FLATPAK_ID: &str = "FLATPAK_ID";
const ENV_SNAP: &str = "SNAP";

/// Present in every Flatpak sandbox, including ones that don't export
/// `FLATPAK_ID` to the app process.
const FLATPAK_INFO_PATH: &str = "/.flatpak-info";

/// Environment variables [`current_channel`] samples. Kept explicit so the
/// probe never captures the whole environment (which would end up in logs and
/// snapshots).
const PROBED_ENV_KEYS: &[&str] = &[ENV_APPIMAGE, ENV_APPDIR, ENV_FLATPAK_ID, ENV_SNAP];

/// Prefixes a distro package manager owns. A binary that resolves into one of
/// these was put there by `dpkg`/`rpm`/`pacman`/`nix`, not by us.
///
/// `/usr/local` is deliberately absent. The FHS reserves it for software the
/// *administrator* installed, and Debian policy forbids packages from writing
/// there at all — so a binary under `/usr/local/bin` has no owning package
/// manager, and telling its user to "update via your package manager" names a
/// package manager that does not know the file. It falls through to
/// [`InstallChannel::Unknown`], which still refuses to self-install (the plugin
/// has no non-AppImage Linux update mechanism) but shows a plain download link
/// instead of a hint that cannot be acted on.
const PACKAGE_MANAGED_PREFIXES: &[&str] = &[
    "/bin",
    "/sbin",
    "/usr/bin",
    "/usr/sbin",
    "/usr/lib",
    "/usr/lib64",
    "/usr/libexec",
    "/usr/share",
    "/opt",
    "/snap",
    "/var/lib/flatpak",
    "/nix/store",
];

/// Mirrored on the TS side as `InstallChannel` in
/// `@recrest/shared/types/updater`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallChannel {
    AppImage,
    Flatpak,
    Snap,
    /// Installed by a distro package manager (`.deb`, `.rpm`, AUR, nixpkgs…).
    SystemPackage,
    /// macOS `.app` or a Windows installer — the updater's native territory.
    Bundle,
    /// Couldn't be classified. Treated as *not* self-updating: a wrong "yes"
    /// hands the user a button that corrupts a package install, a wrong "no"
    /// only costs them a manual download.
    Unknown,
}

// Only the release-only plugin path (`update::mod`, `commands::update`) asks
// these questions; debug builds never register the updater plugin.
#[cfg_attr(debug_assertions, allow(dead_code))]
impl InstallChannel {
    /// Whether `tauri-plugin-updater` may download and swap the binary.
    pub fn can_self_install(self) -> bool {
        matches!(self, Self::AppImage | Self::Bundle)
    }

    /// Whether an external package manager owns updates for this install.
    /// Drives the banner's "update via your package manager" hint.
    pub fn is_package_managed(self) -> bool {
        matches!(self, Self::Flatpak | Self::Snap | Self::SystemPackage)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetOs {
    Linux,
    MacOs,
    Windows,
    Other,
}

impl TargetOs {
    fn current() -> Self {
        match std::env::consts::OS {
            "linux" => Self::Linux,
            "macos" => Self::MacOs,
            "windows" => Self::Windows,
            _ => Self::Other,
        }
    }
}

/// Everything [`detect_channel`] is allowed to look at.
#[derive(Debug, Clone)]
pub struct ChannelProbe {
    pub target_os: TargetOs,
    /// The running executable, symlinks already resolved. `None` when the OS
    /// wouldn't tell us.
    pub exe_path: Option<PathBuf>,
    pub env: HashMap<String, String>,
    pub flatpak_info_exists: bool,
}

/// Pure classification — no filesystem, no environment, no OS calls.
pub fn detect_channel(probe: &ChannelProbe) -> InstallChannel {
    match probe.target_os {
        TargetOs::MacOs | TargetOs::Windows => InstallChannel::Bundle,
        TargetOs::Linux => detect_linux(probe),
        TargetOs::Other => InstallChannel::Unknown,
    }
}

fn detect_linux(probe: &ChannelProbe) -> InstallChannel {
    // Container runtimes outrank the path heuristic: inside a Flatpak or Snap
    // the executable sits under a runtime-owned prefix (`/app/bin`, `/snap/…`)
    // that says nothing about how the host packaged us.
    if probe.flatpak_info_exists || env_is_set(&probe.env, ENV_FLATPAK_ID) {
        return InstallChannel::Flatpak;
    }
    if env_is_set(&probe.env, ENV_SNAP) {
        return InstallChannel::Snap;
    }
    // `APPIMAGE` — the path to the image itself — is what the AppImage runtime
    // always exports, and nothing else uses that name. It stays conclusive.
    if env_is_set(&probe.env, ENV_APPIMAGE) {
        return InstallChannel::AppImage;
    }

    match probe.exe_path.as_deref() {
        Some(path) if is_package_managed_path(path) => InstallChannel::SystemPackage,
        // `APPDIR` is the fallback for an AppImage whose runtime did not export
        // `APPIMAGE`, and it is checked *after* the managed prefixes on purpose.
        // Every other branch here fails closed; this one used to fail open,
        // because `APPDIR` is a generic name (autotools' staged-install
        // variable, a few third-party launchers). A `.deb` install started from
        // a shell that happens to export it was classified as an AppImage,
        // which re-enabled the Install button and pointed
        // `download_and_install` at a root-owned prefix. Two guards close that:
        // the executable must actually live under `$APPDIR`, and a
        // package-managed path wins — which also neutralises an over-broad
        // value such as `APPDIR=/usr`. A real AppImage is unaffected: its
        // runtime mounts the squashfs under `/tmp`, which no package manager
        // owns.
        Some(path) if exe_lives_under_appdir(probe, path) => InstallChannel::AppImage,
        // A Linux binary that is neither an AppImage nor package-managed (a
        // hand-unpacked tarball, a `cargo build` artifact): the plugin has no
        // Linux update mechanism outside AppImage, so there is nothing to
        // offer. Same verdict when the path is unknown entirely.
        _ => InstallChannel::Unknown,
    }
}

/// Whether `$APPDIR` is set *and* contains `exe` — the layout an AppImage
/// always has, since its runtime mounts the squashfs and execs the binary from
/// inside that mount.
///
/// The emptiness check is load-bearing beyond the usual "stale export" case:
/// `Path::starts_with(Path::new(""))` is `true` for every path, so a blank
/// `APPDIR` would otherwise match anything.
fn exe_lives_under_appdir(probe: &ChannelProbe, exe: &Path) -> bool {
    probe
        .env
        .get(ENV_APPDIR)
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .is_some_and(|dir| exe.starts_with(Path::new(dir)))
}

/// Empty values count as unset — a shell exporting `APPIMAGE=` must not be
/// read as "this is an AppImage".
fn env_is_set(env: &HashMap<String, String>, key: &str) -> bool {
    env.get(key).is_some_and(|v| !v.trim().is_empty())
}

/// Component-wise prefix match, so `/usr/binaries/recrest` is not mistaken for
/// something under `/usr/bin`.
fn is_package_managed_path(path: &Path) -> bool {
    PACKAGE_MANAGED_PREFIXES
        .iter()
        .any(|prefix| path.starts_with(Path::new(prefix)))
}

/// Resolves the executable through the filesystem so a symlinked launcher
/// (`/usr/bin/recrest` → `/opt/recrest/recrest`, or the `/bin` → `usr/bin`
/// merge on Arch and Fedora) is classified by its real location. Keeps the raw
/// path when canonicalization fails — a `/usr/bin` path we can't `stat` is
/// still better evidence than nothing.
fn resolve_exe_path(raw: Option<PathBuf>) -> Option<PathBuf> {
    raw.map(|path| path.canonicalize().unwrap_or(path))
}

fn probe_environment() -> ChannelProbe {
    let env = PROBED_ENV_KEYS
        .iter()
        .filter_map(|key| {
            std::env::var(key)
                .ok()
                .map(|value| ((*key).to_string(), value))
        })
        .collect();

    ChannelProbe {
        target_os: TargetOs::current(),
        exe_path: resolve_exe_path(std::env::current_exe().ok()),
        env,
        flatpak_info_exists: Path::new(FLATPAK_INFO_PATH).exists(),
    }
}

/// Classify the running installation from the real environment.
pub fn current_channel() -> InstallChannel {
    detect_channel(&probe_environment())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn probe(target_os: TargetOs, exe: Option<&str>, env: &[(&str, &str)]) -> ChannelProbe {
        ChannelProbe {
            target_os,
            exe_path: exe.map(PathBuf::from),
            env: env
                .iter()
                .map(|(k, v)| ((*k).to_string(), (*v).to_string()))
                .collect(),
            flatpak_info_exists: false,
        }
    }

    #[test]
    fn appimage_env_wins_over_the_mount_path() {
        // The runtime mounts the squashfs under /tmp, which is not a managed
        // prefix — but the decision must come from APPIMAGE either way.
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/tmp/.mount_Recresabc123/usr/bin/recrest"),
            &[
                (ENV_APPIMAGE, "/home/dev/Applications/Recrest.AppImage"),
                (ENV_APPDIR, "/tmp/.mount_Recresabc123"),
            ],
        ));
        assert_eq!(channel, InstallChannel::AppImage);
        assert!(channel.can_self_install());
        assert!(!channel.is_package_managed());
    }

    #[test]
    fn appdir_counts_only_when_the_exe_lives_under_it() {
        // Real AppImage layout: the runtime mounts the squashfs and execs the
        // binary from inside the mount, so `APPDIR` is a prefix of the exe.
        let inside = detect_channel(&probe(
            TargetOs::Linux,
            Some("/tmp/.mount_Recresabc123/usr/bin/recrest"),
            &[(ENV_APPDIR, "/tmp/.mount_Recresabc123")],
        ));
        assert_eq!(inside, InstallChannel::AppImage);
        assert!(inside.can_self_install());

        // Same variable, binary somewhere else entirely — then `APPDIR` belongs
        // to whatever else exported it, not to an AppImage runtime.
        let outside = detect_channel(&probe(
            TargetOs::Linux,
            Some("/home/dev/apps/recrest/recrest"),
            &[(ENV_APPDIR, "/tmp/.mount_Recresabc123")],
        ));
        assert_eq!(outside, InstallChannel::Unknown);
        assert!(!outside.can_self_install());
    }

    #[test]
    fn a_foreign_appdir_does_not_unlock_a_distro_install() {
        // The fail-open case: a dpkg-owned /usr/bin binary launched from a
        // shell that exports `APPDIR` for unrelated reasons. Classifying that
        // as an AppImage would re-enable the Install button and point
        // `download_and_install` at a root-owned prefix.
        for appdir in ["/home/dev/build/staging", "/usr", "/"] {
            let channel = detect_channel(&probe(
                TargetOs::Linux,
                Some("/usr/bin/recrest"),
                &[(ENV_APPDIR, appdir)],
            ));
            assert_eq!(
                channel,
                InstallChannel::SystemPackage,
                "APPDIR={appdir} must not turn a /usr/bin install into an AppImage"
            );
            assert!(!channel.can_self_install());
            assert!(channel.is_package_managed());
        }
    }

    #[test]
    fn a_blank_appdir_matches_nothing() {
        // `Path::starts_with(Path::new(""))` is true for every path, so the
        // emptiness filter is the only thing keeping `export APPDIR=` from
        // classifying every install as an AppImage.
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/usr/bin/recrest"),
            &[(ENV_APPDIR, "   ")],
        ));
        assert_eq!(channel, InstallChannel::SystemPackage);
    }

    #[test]
    fn usr_bin_without_appimage_is_package_managed() {
        for exe in [
            "/usr/bin/recrest",
            "/opt/recrest/recrest",
            "/nix/store/abc123-recrest-0.10.2/bin/recrest",
        ] {
            let channel = detect_channel(&probe(TargetOs::Linux, Some(exe), &[]));
            assert_eq!(
                channel,
                InstallChannel::SystemPackage,
                "{exe} must be classified as package-managed"
            );
            assert!(!channel.can_self_install(), "{exe} must not self-install");
            assert!(channel.is_package_managed());
        }
    }

    #[test]
    fn empty_appimage_var_does_not_unlock_self_install() {
        // A stale `export APPIMAGE=` in the user's shell profile must not turn
        // a pacman install into a self-updating one.
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/usr/bin/recrest"),
            &[(ENV_APPIMAGE, "   ")],
        ));
        assert_eq!(channel, InstallChannel::SystemPackage);
    }

    #[test]
    fn flatpak_info_file_is_enough() {
        let mut p = probe(TargetOs::Linux, Some("/app/bin/recrest"), &[]);
        p.flatpak_info_exists = true;
        let channel = detect_channel(&p);
        assert_eq!(channel, InstallChannel::Flatpak);
        assert!(!channel.can_self_install());
        assert!(channel.is_package_managed());
    }

    #[test]
    fn flatpak_id_env_is_enough() {
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/app/bin/recrest"),
            &[(ENV_FLATPAK_ID, "eu.benova.Recrest")],
        ));
        assert_eq!(channel, InstallChannel::Flatpak);
    }

    #[test]
    fn flatpak_outranks_a_stray_appimage_var() {
        let mut p = probe(
            TargetOs::Linux,
            Some("/app/bin/recrest"),
            &[(ENV_APPIMAGE, "/app/Recrest.AppImage")],
        );
        p.flatpak_info_exists = true;
        assert_eq!(detect_channel(&p), InstallChannel::Flatpak);
    }

    #[test]
    fn snap_env_is_detected() {
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/snap/recrest/17/bin/recrest"),
            &[(ENV_SNAP, "/snap/recrest/17")],
        ));
        assert_eq!(channel, InstallChannel::Snap);
        assert!(!channel.can_self_install());
        assert!(channel.is_package_managed());
    }

    #[test]
    fn unpacked_linux_binary_is_unknown() {
        // No AppImage runtime and no managed prefix — the plugin has no way to
        // update this, so it must not advertise one.
        let channel = detect_channel(&probe(
            TargetOs::Linux,
            Some("/home/dev/apps/recrest/recrest"),
            &[],
        ));
        assert_eq!(channel, InstallChannel::Unknown);
        assert!(!channel.can_self_install());
        assert!(!channel.is_package_managed());
    }

    #[test]
    fn linux_without_a_resolvable_exe_path_fails_closed() {
        let channel = detect_channel(&probe(TargetOs::Linux, None, &[]));
        assert_eq!(channel, InstallChannel::Unknown);
        assert!(!channel.can_self_install());
    }

    #[test]
    fn usr_local_is_not_package_managed() {
        // FHS reserves /usr/local for the administrator and Debian policy
        // forbids packages from writing there, so no package manager owns
        // these files — "update via your package manager" would name one that
        // has never heard of them. Still no self-install: the plugin has no
        // Linux mechanism outside AppImage.
        for exe in [
            "/usr/local/bin/recrest",
            "/usr/local/sbin/recrest",
            "/usr/local/lib/recrest/recrest",
        ] {
            let channel = detect_channel(&probe(TargetOs::Linux, Some(exe), &[]));
            assert_eq!(channel, InstallChannel::Unknown, "{exe}");
            assert!(!channel.can_self_install(), "{exe} must not self-install");
            assert!(!channel.is_package_managed(), "{exe} has no owning package");
        }
    }

    #[test]
    fn near_miss_prefixes_are_not_package_managed() {
        for exe in [
            "/usr/binaries/recrest",
            "/optional/recrest",
            "/snapshots/recrest",
        ] {
            assert_eq!(
                detect_channel(&probe(TargetOs::Linux, Some(exe), &[])),
                InstallChannel::Unknown,
                "{exe} must not match a managed prefix"
            );
        }
    }

    #[test]
    fn macos_and_windows_stay_self_updating() {
        for (os, exe) in [
            (
                TargetOs::MacOs,
                Some("/Applications/Recrest.app/Contents/MacOS/recrest"),
            ),
            // Homebrew Cask's prefix looks package-managed but installs the
            // very same .app bundle the updater replaces.
            (
                TargetOs::MacOs,
                Some("/opt/homebrew/Caskroom/recrest/0.10.2/Recrest.app/Contents/MacOS/recrest"),
            ),
            (
                TargetOs::Windows,
                Some(r"C:\Program Files\Recrest\recrest.exe"),
            ),
            (TargetOs::MacOs, None),
        ] {
            let channel = detect_channel(&probe(os, exe, &[]));
            assert_eq!(channel, InstallChannel::Bundle);
            assert!(channel.can_self_install());
            assert!(!channel.is_package_managed());
        }
    }

    #[test]
    fn unsupported_os_fails_closed() {
        let channel = detect_channel(&probe(TargetOs::Other, Some("/usr/local/bin/recrest"), &[]));
        assert_eq!(channel, InstallChannel::Unknown);
        assert!(!channel.can_self_install());
    }

    #[test]
    fn channels_serialize_as_the_shared_camel_case_dto() {
        let pairs = [
            (InstallChannel::AppImage, "\"appImage\""),
            (InstallChannel::Flatpak, "\"flatpak\""),
            (InstallChannel::Snap, "\"snap\""),
            (InstallChannel::SystemPackage, "\"systemPackage\""),
            (InstallChannel::Bundle, "\"bundle\""),
            (InstallChannel::Unknown, "\"unknown\""),
        ];
        for (channel, expected) in pairs {
            assert_eq!(serde_json::to_string(&channel).unwrap(), expected);
        }
    }

    #[cfg(unix)]
    #[test]
    fn resolve_exe_path_follows_symlinks() {
        let dir = tempfile::tempdir().unwrap();
        let real = dir.path().join("real-recrest");
        std::fs::write(&real, b"binary").unwrap();
        let link = dir.path().join("recrest");
        std::os::unix::fs::symlink(&real, &link).unwrap();

        let resolved = resolve_exe_path(Some(link)).unwrap();
        assert_eq!(resolved, real.canonicalize().unwrap());
    }

    #[test]
    fn resolve_exe_path_keeps_a_path_it_cannot_stat() {
        let missing = PathBuf::from("/usr/bin/recrest-does-not-exist-here");
        assert_eq!(resolve_exe_path(Some(missing.clone())), Some(missing));
        assert_eq!(resolve_exe_path(None), None);
    }

    #[test]
    fn current_channel_matches_the_probe_of_the_real_environment() {
        // Whatever the host is, the wrapper must agree with the pure function
        // fed the same inputs — this is the only assertion we can make without
        // an actual distro install.
        assert_eq!(current_channel(), detect_channel(&probe_environment()));
    }
}
