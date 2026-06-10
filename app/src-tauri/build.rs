fn main() {
    // Icons are pulled in by `include_bytes!` in `src/lib.rs`. Cargo tracks
    // `include_bytes!` paths automatically, but only when the macro is
    // re-evaluated — if a stale incremental cache decides not to recompile
    // lib.rs, the embedded bytes go stale. Adding explicit
    // `cargo:rerun-if-changed` here forces a full rebuild whenever any
    // icon asset changes on disk, so `yarn tauri:dev` always picks up the
    // latest PNG/ICNS bytes.
    for path in [
        "icons/mac/icon.icns",
        "icons/mac/icon-dark.icns",
        "icons/windows/icon-light.png",
        "icons/windows/icon-dark.png",
        "icons/tray/tray-template@2x.png",
        "icons/tray/tray-light.png",
        "icons/tray/tray-dark.png",
        "icons-dev/mac/icon-light.icns",
        "icons-dev/mac/icon-dark.icns",
        "icons-dev/windows/icon-light.png",
        "icons-dev/windows/icon-dark.png",
    ] {
        println!("cargo:rerun-if-changed={path}");
    }

    // `attrs` is only reassigned on Windows (the debug-icon override below);
    // on other platforms the binding is never mutated, so silence the
    // unused-mut lint off-Windows while keeping `mut` valid for the Windows path.
    #[cfg_attr(not(target_os = "windows"), allow(unused_mut))]
    let mut attrs = tauri_build::Attributes::new();

    // Debug builds (`tauri:dev`) embed the orange dev icon as the Windows
    // .exe resource (ID 32512 / IDI_APPLICATION) so the taskbar shows the
    // dev variant before the process has even had a chance to call
    // `Window::set_icon`. `WindowsAttributes::window_icon_path` is the
    // supported hook for this — tauri-build defaults to the first `.ico`
    // in `bundle.icon`, which under `tauri.conf.json` is the prod icon.
    // Release builds skip the override so production .exe keeps the
    // production icon untouched.
    #[cfg(target_os = "windows")]
    {
        if std::env::var("PROFILE").as_deref() == Ok("debug") {
            println!("cargo:rerun-if-changed=icons-dev/windows/icon.ico");
            let windows = tauri_build::WindowsAttributes::new()
                .window_icon_path("icons-dev/windows/icon.ico");
            attrs = attrs.windows_attributes(windows);
        }
    }

    if let Err(err) = tauri_build::try_build(attrs) {
        let err = format!("{err:#}");
        println!("{err}");
        std::process::exit(1);
    }
}
