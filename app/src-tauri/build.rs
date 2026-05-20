fn main() {
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
            println!("cargo:rerun-if-changed=icons-dev/icon.ico");
            let windows = tauri_build::WindowsAttributes::new()
                .window_icon_path("icons-dev/icon.ico");
            attrs = attrs.windows_attributes(windows);
        }
    }

    if let Err(err) = tauri_build::try_build(attrs) {
        let err = format!("{err:#}");
        println!("{err}");
        std::process::exit(1);
    }
}
