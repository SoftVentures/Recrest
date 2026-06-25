mod auth;
mod commands;
mod config;
mod discovery;
mod git;
mod identity;
mod platform;
mod providers;
mod update;

#[cfg(test)]
mod test_support;

use std::collections::HashMap;
use std::sync::Arc;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};
// Click-routing types are only used on Windows + Linux, where the tray's
// left-click brings the window forward. macOS follows the menu-bar
// convention (left-click opens the menu directly via
// `show_menu_on_left_click(true)`), so it never reads click events.
#[cfg(not(target_os = "macos"))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
use tokio::sync::Mutex;
use tracing_subscriber::EnvFilter;
use zeroize::Zeroizing;

use crate::config::store::ConfigStore;
use crate::git::watcher::RepoWatcher;
use crate::providers::registry::ProviderRegistry;

/// Shared application state made available to every Tauri command.
pub struct AppState {
    pub config: Arc<Mutex<ConfigStore>>,
    pub providers: Arc<ProviderRegistry>,
    pub watcher: Arc<Mutex<Option<RepoWatcher>>>,
    /// Tuple of (provider_id, CSRF nonce) for the in-flight OAuth flow.
    /// Cleared as soon as `complete_oauth` consumes it.
    pub oauth_pending: Arc<Mutex<Option<(String, String)>>>,
    /// Session-only cache of SSH key passphrases keyed by repo id. Never
    /// persisted; `Zeroizing` wipes the bytes on drop.
    pub ssh_passphrases: Arc<Mutex<HashMap<String, Zeroizing<String>>>>,
}

#[cfg(target_os = "macos")]
const ICON_PROD_LIGHT: &[u8] = include_bytes!("../icons/mac/icon.icns");
#[cfg(target_os = "macos")]
const ICON_PROD_DARK: &[u8] = include_bytes!("../icons/mac/icon-dark.icns");
#[cfg(target_os = "macos")]
const ICON_DEV_LIGHT: &[u8] = include_bytes!("../icons-dev/mac/icon-light.icns");
#[cfg(target_os = "macos")]
const ICON_DEV_DARK: &[u8] = include_bytes!("../icons-dev/mac/icon-dark.icns");

// Tray icon: single monochrome set, shared between prod and dev. macOS
// treats it as a template image (alpha-only, auto-tinted by the menu bar);
// Windows swaps between light/dark on `WindowEvent::ThemeChanged`. Dev
// builds reuse the same artwork — the tray tooltip
// (`identity::current_tray_tooltip()`) is what distinguishes them.
#[cfg(any(target_os = "macos", all(unix, not(target_os = "macos"))))]
const TRAY_ICON: &[u8] = include_bytes!("../icons/tray/tray-template@2x.png");

#[cfg(windows)]
const TRAY_ICON_LIGHT: &[u8] = include_bytes!("../icons/tray/tray-light.png");
#[cfg(windows)]
const TRAY_ICON_DARK: &[u8] = include_bytes!("../icons/tray/tray-dark.png");

#[cfg(any(target_os = "macos", all(unix, not(target_os = "macos"))))]
fn tray_icon_bytes() -> &'static [u8] {
    TRAY_ICON
}

#[cfg(windows)]
fn tray_icon_bytes(dark: bool) -> &'static [u8] {
    if dark {
        TRAY_ICON_DARK
    } else {
        TRAY_ICON_LIGHT
    }
}

/// Disable WKWebView's window-occlusion detection.
///
/// WKWebView, by default, treats a window hidden by Stage Manager (or
/// covered by another app) as "occluded" and throttles / purges its
/// rendering buffer to save power. Disabling it keeps the webview rendering
/// when backgrounded, so its content (and any Stage Manager thumbnail) stays
/// fresh and there's no blank webview on refocus.
///
/// NOTE: this does NOT fix the Stage Manager black-flicker in the
/// translucent area — that was conclusively traced to the OS vibrancy
/// material (NSVisualEffectView/NSGlassEffectView) flashing during the
/// swap-in animation, which is an unfixable macOS Tahoe behaviour (see
/// `commands::theme::apply_translucency` and the tracking issue). We keep
/// this call anyway because not purging the webview is the correct
/// behaviour for an always-glanceable dashboard.
///
/// `_setWindowOcclusionDetectionEnabled:NO` is a private WebKit selector;
/// we guard with `respondsToSelector:` so a future WebKit that drops it
/// degrades gracefully. (Recrest ships outside the Mac App Store, so the
/// private-API review restriction doesn't apply.) We descend the NSWindow's
/// view hierarchy to find the WKWebView because wry/tao don't expose it.
#[cfg(target_os = "macos")]
fn disable_webview_occlusion_detection(window: &tauri::WebviewWindow) {
    use objc2::runtime::{AnyClass, AnyObject, Bool, Sel};
    use objc2::{msg_send, sel};

    let Ok(raw_handle) = window.ns_window() else {
        tracing::warn!("[macos] occlusion: ns_window() failed");
        return;
    };
    if raw_handle.is_null() {
        return;
    }
    let handle_addr = raw_handle as usize;
    let _ = window.run_on_main_thread(move || {
        if handle_addr == 0 {
            return;
        }
        unsafe {
            let ns_window = handle_addr as *mut AnyObject;
            let content_view: *mut AnyObject = msg_send![ns_window, contentView];
            if content_view.is_null() {
                return;
            }
            let Some(webview_class) = AnyClass::get(c"WKWebView") else {
                tracing::warn!("[macos] occlusion: WKWebView class not found");
                return;
            };
            // Recursively find the WKWebView in the view tree.
            fn find_webview(
                view: *mut AnyObject,
                class: &AnyClass,
            ) -> Option<*mut AnyObject> {
                if view.is_null() {
                    return None;
                }
                unsafe {
                    let is_webview: Bool = msg_send![view, isKindOfClass: class];
                    if is_webview.as_bool() {
                        return Some(view);
                    }
                    let subviews: *mut AnyObject = msg_send![view, subviews];
                    if subviews.is_null() {
                        return None;
                    }
                    let count: usize = msg_send![subviews, count];
                    for i in 0..count {
                        let sub: *mut AnyObject = msg_send![subviews, objectAtIndex: i];
                        if let Some(found) = find_webview(sub, class) {
                            return Some(found);
                        }
                    }
                }
                None
            }

            let Some(webview) = find_webview(content_view, webview_class) else {
                tracing::warn!("[macos] occlusion: WKWebView not found in view tree");
                return;
            };
            let sel_occlusion: Sel = sel!(_setWindowOcclusionDetectionEnabled:);
            let responds: Bool = msg_send![webview, respondsToSelector: sel_occlusion];
            if responds.as_bool() {
                let _: () = msg_send![webview, _setWindowOcclusionDetectionEnabled: false];
            } else {
                tracing::warn!("[macos] occlusion: WKWebView does not respond to selector");
            }
        }
    });
}


#[cfg(target_os = "macos")]
fn is_system_dark(app: &objc2_app_kit::NSApplication) -> bool {
    use objc2_foundation::NSString;
    let appearance = app.effectiveAppearance();
    let name = appearance.name();
    name.isEqualToString(&NSString::from_str("NSAppearanceNameDarkAqua"))
}

/// Main-thread query for "is the OS in dark mode" that doesn't require the
/// caller to already hold an `NSApplication`. Exposed to the renderer via
/// the `get_system_dark_mode` command so the frontend can resolve the real
/// system theme even when WKWebView's `matchMedia("(prefers-color-scheme:
/// dark)")` lies on cold start (a known WebKit quirk: the webview's
/// effective appearance can lag the system appearance for the first JS
/// tick after launch, causing the inline anti-flash script to paint light
/// even on a dark-mode system). Returns `None` off the main thread — the
/// caller should treat that as "unknown" and fall back to matchMedia.
#[cfg(target_os = "macos")]
pub fn macos_system_dark() -> Option<bool> {
    use objc2_app_kit::NSApplication;
    let mtm = objc2::MainThreadMarker::new()?;
    let app = NSApplication::sharedApplication(mtm);
    Some(is_system_dark(&app))
}

#[cfg(target_os = "macos")]
fn pick_icon_bytes(dark: bool) -> &'static [u8] {
    let dev = cfg!(debug_assertions);
    match (dev, dark) {
        (false, false) => ICON_PROD_LIGHT,
        (false, true) => ICON_PROD_DARK,
        (true, false) => ICON_DEV_LIGHT,
        (true, true) => ICON_DEV_DARK,
    }
}

/// Set the process name macOS uses for the Dock hover label of an unbundled
/// `cargo run` binary. Without this, the Dock reads the binary filename
/// (`recrest`, lowercase) from `[NSProcessInfo processInfo].processName`.
/// Must run BEFORE any other macOS-facing code so the name is in place before
/// AppKit/Dock caches the initial value.
#[cfg(target_os = "macos")]
fn set_macos_process_name() {
    use objc2_foundation::{NSProcessInfo, NSString};
    let info = NSProcessInfo::processInfo();
    let name = NSString::from_str(crate::identity::current_tray_tooltip());
    info.setProcessName(&name);
}

/// Apply the dock icon variant matching the current system appearance.
/// Must run on the main thread (NSApplication is main-thread-only). Idempotent,
/// so the polling task in `spawn_macos_appearance_poller` can call it freely.
///
/// All live updates are driven by that poller. We previously tried two
/// notification-based paths and both proved unreliable for system-wide
/// appearance flips in Tauri dev/release builds:
///
///   - `NSDistributedNotificationCenter` observer for
///     `AppleInterfaceThemeChangedNotification` — registered cleanly but the
///     block never fired (likely because the dev binary is not a proper .app
///     bundle and lacks the LSUIElement/sandbox plumbing that lets the
///     distributed notification center route system-wide notifications to us).
///   - Tauri's `WindowEvent::ThemeChanged` — tao only emits this on macOS for
///     explicit per-window theme overrides, not system appearance flips.
///
/// Polling a single `effectiveAppearance` read every 1.5s is essentially free
/// and guarantees the icon stays in sync.
#[cfg(target_os = "macos")]
fn set_macos_app_icon() {
    use objc2::AnyThread;
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let Some(mtm) = objc2::MainThreadMarker::new() else {
        return;
    };
    let app = NSApplication::sharedApplication(mtm);
    let dark = is_system_dark(&app);
    tracing::info!("[macos] applying app icon, dark={dark}");
    let bytes = pick_icon_bytes(dark);
    let data = NSData::with_bytes(bytes);
    let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) else {
        return;
    };
    // Belt-and-suspenders against the macOS Dock's icon cache for unbundled
    // `cargo run` binaries: clear NSApp's icon image first so AppKit can't
    // short-circuit the second call as a no-op, set the new image, then
    // tell the Dock tile to redraw immediately. Apple's documented fix for
    // a stale Dock tile is `-[NSDockTile display]` — without it the Dock
    // visually keeps the cached pixels even after `setApplicationIconImage`
    // returns successfully.
    unsafe {
        app.setApplicationIconImage(None);
        app.setApplicationIconImage(Some(&image));
        let dock_tile = app.dockTile();
        dock_tile.display();
    }
}

/// Poll `NSApp.effectiveAppearance` every 1.5s on the main thread; when the
/// dark-mode bit flips, re-apply the dock icon. Runs for the lifetime of the
/// process — no shutdown signal, the task dies with the runtime on exit.
///
/// 1.5s is chosen as a comfortable middle: a single `effectiveAppearance`
/// read costs microseconds so the CPU cost is negligible, sub-2s latency
/// after a manual theme toggle is imperceptible in practice, and the
/// non-round interval avoids visibly syncing with any 1Hz system polls.
#[cfg(target_os = "macos")]
fn spawn_macos_appearance_poller(app: AppHandle) {
    use std::sync::{Arc, Mutex as StdMutex};
    use std::time::Duration;

    let initial = macos_system_dark().unwrap_or(false);
    let last = Arc::new(StdMutex::new(initial));
    tracing::info!("[macos] appearance poller spawning (initial dark={initial})");

    // Use a plain std::thread instead of tokio::spawn to rule out any
    // async-runtime interaction. The thread sleeps + hops to the main thread
    // via `app.run_on_main_thread` once per tick.
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(1500));
        let last = Arc::clone(&last);
        let result = app.run_on_main_thread(move || {
            let dark = macos_system_dark().unwrap_or(false);
            let mut guard = match last.lock() {
                Ok(g) => g,
                Err(poisoned) => poisoned.into_inner(),
            };
            if dark != *guard {
                *guard = dark;
                tracing::info!("[macos] appearance changed: dark={dark}");
                set_macos_app_icon();
            }
        });
        if let Err(e) = result {
            tracing::warn!("[macos] run_on_main_thread failed: {e:?}");
        }
    });
}

// Both light + dark 128×128 PNGs are embedded so the Windows runtime can
// swap the taskbar / tray icon when the OS toggles light/dark mode. The
// EXE-resource icon (embedded via `WindowsAttributes::window_icon_path` in
// build.rs) stays static — that's the icon Windows shows for ~1 frame at
// process start, but as soon as `set_windows_app_icon` runs the runtime
// version wins and starts following the OS theme.
#[cfg(windows)]
const ICON_WIN_PROD_LIGHT: &[u8] = include_bytes!("../icons/windows/icon-light.png");
#[cfg(windows)]
const ICON_WIN_PROD_DARK: &[u8] = include_bytes!("../icons/windows/icon-dark.png");
#[cfg(windows)]
const ICON_WIN_DEV_LIGHT: &[u8] = include_bytes!("../icons-dev/windows/icon-light.png");
#[cfg(windows)]
const ICON_WIN_DEV_DARK: &[u8] = include_bytes!("../icons-dev/windows/icon-dark.png");

#[cfg(windows)]
fn pick_windows_icon_bytes(dark: bool) -> &'static [u8] {
    let dev = cfg!(debug_assertions);
    match (dev, dark) {
        (false, false) => ICON_WIN_PROD_LIGHT,
        (false, true) => ICON_WIN_PROD_DARK,
        (true, false) => ICON_WIN_DEV_LIGHT,
        (true, true) => ICON_WIN_DEV_DARK,
    }
}

/// Reads `HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize
/// \AppsUseLightTheme` — Windows 10+'s canonical "is the user running apps
/// in dark mode" flag (0 = dark, 1 = light). Tauri's
/// `Window::theme()` would work in principle but it's tied to the
/// per-window theme override; we want the **system** preference so the
/// taskbar/tray icon stays in sync with Explorer regardless of what theme
/// the renderer is using.
#[cfg(windows)]
fn windows_uses_dark_mode() -> bool {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegGetValueW, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER, KEY_READ,
        RRF_RT_REG_DWORD,
    };

    let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let value_name: Vec<u16> = "AppsUseLightTheme"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(subkey.as_ptr()),
            Some(0),
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return false; // Default to light if registry isn't readable.
        }
        let mut data: u32 = 1;
        let mut size: u32 = std::mem::size_of::<u32>() as u32;
        let result = RegGetValueW(
            hkey,
            None,
            PCWSTR(value_name.as_ptr()),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut data as *mut u32 as *mut _),
            Some(&mut size),
        );
        let _ = RegCloseKey(hkey);
        if result.is_err() {
            return false;
        }
        // `AppsUseLightTheme = 0` → dark mode, `= 1` → light mode.
        data == 0
    }
}

/// Apply the right window+tray icon for the current Windows theme. Called
/// at setup and on every `WindowEvent::ThemeChanged`.
///
/// Tauri/tao's `Window::set_icon` only sends `WM_SETICON(ICON_SMALL, …)` —
/// that updates the titlebar/Alt-Tab thumbnail but leaves the **taskbar
/// tile** still showing whatever ICON_BIG was set to last (typically the
/// EXE resource icon). The taskbar pin slot reads `ICON_BIG`, so we
/// mirror the small-slot HICON over via raw `SendMessage` here. The HICON
/// itself is owned by tao's internal `WinIcon` cache (kept alive by the
/// window's `window_state`), so sharing the handle across both slots is
/// safe for the lifetime of this window.
#[cfg(windows)]
fn apply_windows_theme_icon(app: &AppHandle) {
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        SendMessageW, ICON_BIG, ICON_SMALL, WM_GETICON, WM_SETICON,
    };

    let dark = windows_uses_dark_mode();
    let window_bytes = pick_windows_icon_bytes(dark);
    let window_image = match tauri::image::Image::from_bytes(window_bytes) {
        Ok(image) => image,
        Err(err) => {
            tracing::warn!("[windows] could not decode app icon: {err}");
            return;
        }
    };

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(window_image);

        if let Ok(raw) = window.hwnd() {
            let hwnd = HWND(raw.0 as *mut _);
            unsafe {
                let small_hicon = SendMessageW(
                    hwnd,
                    WM_GETICON,
                    Some(WPARAM(ICON_SMALL as usize)),
                    Some(LPARAM(0)),
                );
                if small_hicon.0 != 0 {
                    SendMessageW(
                        hwnd,
                        WM_SETICON,
                        Some(WPARAM(ICON_BIG as usize)),
                        Some(LPARAM(small_hicon.0)),
                    );
                }
            }
        }
    }

    // Tray uses a separate monochrome/transparent icon set so the system
    // tray stays theme-correct (window/taskbar wants the colorful tile).
    let tray_bytes = tray_icon_bytes(dark);
    match tauri::image::Image::from_bytes(tray_bytes) {
        Ok(tray_image) => {
            if let Some(tray) = app.tray_by_id(commands::tray::TRAY_ID) {
                let _ = tray.set_icon(Some(tray_image));
            }
        }
        Err(err) => {
            tracing::warn!("[windows] could not decode tray icon: {err}");
        }
    }
}

#[cfg(windows)]
fn set_app_user_model_id() {
    // Must match `tauri.conf.json::identifier` so future Start-Menu entries
    // (installer-written shortcuts) and this runtime setting address the
    // same notification channel. M4: routed through the high-level `windows`
    // crate (PCWSTR + windows_core::Result) so we have a single Win32
    // dependency instead of `windows` + `windows-sys` side-by-side.
    //
    // Dev builds get a `.dev` suffix so the Windows taskbar doesn't
    // recycle the prod build's cached pin icon / RelaunchIconResource —
    // the two identities are now distinct in Explorer's per-AUMID store.
    // Resolved via `identity::current_identifier()` so this and the Tauri
    // config (overlaid by `tauri.dev.conf.json` in debug builds) stay in
    // lock-step — diverging would re-introduce the icon-cache collision.
    use windows::core::PCWSTR;
    use windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
    let aumid: Vec<u16> = identity::current_identifier()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    // `SetCurrentProcessExplicitAppUserModelID` returns an HRESULT; failure
    // is non-fatal (notifications still work, just with the parent-process
    // name). Silently swallow so a weird Windows build doesn't crash boot.
    unsafe {
        let _ = SetCurrentProcessExplicitAppUserModelID(PCWSTR(aumid.as_ptr()));
    }
}

/// Bring the main window forward — show, unminimize, focus. Used by the
/// tray click handler, the Show menu item, and the macOS Reopen handler
/// (Spotlight relaunch on a tray-hidden app). Also clears `skip_taskbar`
/// because Plan 1 §C.4 sets it on a tray-hidden boot to keep the app off
/// the Windows taskbar; once the user opens the window we want a normal
/// taskbar entry again.
fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_skip_taskbar(false);
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    // GUI-gestartete Apps erben auf macOS/Linux nicht den interaktiven $PATH
    // aus dem User-Shell. Das ist der Hauptgrund, warum `open_in_ide` in
    // Prod-Builds oft fehlschlägt obwohl `code`/`cursor` im Terminal laufen.
    // fix-path-env repariert den PATH einmalig beim Start.
    let _ = fix_path_env::fix();

    // macOS: set the process name BEFORE any AppKit/Tauri init — the Dock
    // captures the hover label from `NSProcessInfo.processName` the moment
    // the process registers (which happens implicitly the first time NSApp
    // is touched, deep inside Tauri's window creation). Calling this later
    // (e.g. from inside `setup`) leaves the cached lowercase binary name
    // ("recrest") in the Dock until the next `killall Dock`. Calling it
    // here, before `Builder::default()`, guarantees the right name is read
    // on first registration.
    #[cfg(target_os = "macos")]
    {
        set_macos_process_name();
    }

    // Windows-specific: register an explicit AppUserModelID so Toast
    // notifications attribute to "Recrest" instead of the parent process
    // (e.g. powershell.exe in `yarn dev`). Installed MSI builds already get
    // this via the Start Menu shortcut the installer writes, but the dev
    // binary has no registry entry, so Windows falls back to the launching
    // process name on every toast. Setting it here fixes both dev and
    // portable launches without touching the registry.
    #[cfg(windows)]
    {
        set_app_user_model_id();
    }

    // Mark a session boundary in `.claude-dev.log` so successive `yarn dev`
    // sessions are visually demarcated when reading the file. Debug-only —
    // production builds neither register the command nor write the file.
    #[cfg(debug_assertions)]
    commands::dev_log::log_session_start(identity::current_identifier());

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // I5: respect `--start-minimized` on a second-instance launch.
            // The autostart plugin re-launches the binary with this arg on
            // login; without this guard we'd surface the window every time
            // a user logged in even though the whole point of autostart-
            // with-tray is to stay quietly in the background. NOTE: this
            // only applies to the single_instance callback path. The tray
            // click and macOS Reopen handlers both call `show_main_window`
            // directly because those *are* user-initiated surface actions.
            if argv.iter().any(|a| a == "--start-minimized") {
                return;
            }
            show_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            // Pass `--start-minimized` so the OS launches Recrest into the
            // tray on login (paired with Plan 1 §C.4's start-minimized
            // logic in the setup hook below). Without this arg the
            // autostarted instance would pop the window forward, which is
            // exactly what users disabling-on-startup don't want.
            Some(vec!["--start-minimized".into()]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        // Remember the window's size, position (→ which monitor), maximized
        // and fullscreen state across restarts and re-apply on launch. We omit
        // VISIBLE/DECORATIONS from the persisted flags so the "close to tray"
        // feature can't make the app start up hidden.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::FULLSCREEN,
                )
                .build(),
        )
        .setup(|app| {
            // Logging is handled by `tracing_subscriber` above; we don't register
            // `tauri_plugin_log` because its `env_logger` sink would clash with
            // tracing's global dispatcher (only one logger can be installed).

            let handle = app.handle().clone();

            // Debug builds store provider tokens in a JSON file under
            // `app_data_dir` instead of the OS keychain — see
            // `auth::token::TokenStore` for the rationale (macOS keychain
            // ACL is bound to the binary's code signature, which `cargo
            // build` regenerates on every rebuild, so dev builds would
            // re-prompt on every launch). Release builds keep the keychain.
            // We wire the path from here because the AppHandle is the only
            // way to resolve `app_data_dir` portably.
            #[cfg(debug_assertions)]
            {
                // Plan-8 E2E harness: `RECREST_TEST_PROFILE` redirects the
                // dev-tokens file into a tmpdir so test PATs never land in
                // the user's real app-data dir.
                let token_dir =
                    identity::test_profile_root().or_else(|| handle.path().app_data_dir().ok());
                if let Some(dir) = token_dir {
                    let _ = std::fs::create_dir_all(&dir);
                    auth::token::init_file_backend_path(dir.join("dev-tokens.json"));
                }
                // One-time migration of pre-existing dev tokens out of the
                // OS keychain and into the file. Fires the macOS "Always
                // Allow" prompt once per provider whose entry exists, then
                // the file's existence becomes a sentinel and the keychain
                // is never read again. See
                // `auth::token::migrate_keychain_to_file_if_empty` for the
                // rationale.
                if let Err(err) = crate::auth::token::migrate_keychain_to_file_if_empty() {
                    tracing::warn!("[token] keychain→file migration failed: {err}");
                }
            }

            // Window title carries the dev/prod marker for the taskbar /
            // window switcher. `tauri.conf.json` hard-codes "Recrest" and the
            // `tauri.dev.conf.json` overlay can't safely replace `app.windows[]`,
            // so we set it at runtime via `identity::current_tray_tooltip()` —
            // same string that goes on the tray, kept in one place.
            //
            // macOS is the exception: the Overlay titlebar paints the window
            // title next to the traffic lights, where we want nothing (brand
            // lives in the sidebar). So macOS gets an empty title.
            if let Some(window) = handle.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                let _ = window.set_title("");
                #[cfg(not(target_os = "macos"))]
                let _ = window.set_title(identity::current_tray_tooltip());
                // Belt-and-suspenders: the `tauri.dev.conf.json` overlay's
                // `windows[]` entry omits `decorations: false`, and Tauri's
                // by-label array merge for window config is unreliable (the
                // same reason `visible: false` needs the explicit hide below).
                // In the dev build that lets `decorations` fall back to its
                // `true` default, so the NATIVE Windows/Linux title bar paints
                // on top of our custom titlebar — two stacked title bars. Force
                // it off at runtime for the non-macOS chrome. macOS keeps
                // decorations on deliberately (Overlay traffic-lights, set
                // separately below).
                #[cfg(not(target_os = "macos"))]
                let _ = window.set_decorations(false);
                // Belt-and-suspenders: explicitly hide the window here in
                // case the `visible: false` config-overlay merge didn't
                // apply (Tauri's `tauri.dev.conf.json` deep-merge for
                // arrays-of-objects-by-label is not well-documented and
                // we cannot trust it for boot-critical behaviour). With
                // this explicit `hide()` the window stays off-screen from
                // process start until JS's `getCurrentWebviewWindow().show()`
                // fires, regardless of conf-merge semantics.
                let _ = window.hide();
            }

            // Safety net for the JS-driven `window.show()` in `main.tsx`.
            // The window config has `visible: false` so the cold-boot
            // sequence (transparent → window-shadow → backdrop-filter
            // engaging) never reaches the user; JS calls `show()` after
            // React's first paint. If the bundle fails to load (network
            // hiccup in dev, broken build, …) we'd otherwise leave the
            // window invisible forever — this 3 s deadline guarantees
            // the user sees *something* even in the worst case.
            let safety_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                if let Some(window) = safety_handle.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(true) {
                        let _ = window.show();
                    }
                }
            });

            let mut config = ConfigStore::load_or_default(&handle)?;
            // Reconcile on boot: drop auto-discovered repos that no longer sit
            // under any configured scan root (junk from an earlier too-broad
            // scan, or a scan path removed by an older build before pruning
            // existed). Manual adds are kept. Persist only when something
            // actually changed.
            if !config.prune_orphan_scanned_repos().is_empty() {
                let _ = config.save(&handle);
            }

            // Crash reporting — opt-in via the `crashReporting` setting + a
            // compile-time DSN. `mem::forget` on the returned guard is the
            // simplest way to keep sentry alive for the app's lifetime; the
            // native `ClientInitGuard` drops-to-deinit and we don't want that.
            #[cfg(not(debug_assertions))]
            if config.settings().crash_reporting {
                if let Some(dsn) = option_env!("SENTRY_DSN").and_then(|s| s.parse().ok()) {
                    let guard = sentry::init(sentry::ClientOptions {
                        dsn: Some(dsn),
                        release: Some(env!("CARGO_PKG_VERSION").into()),
                        environment: Some("production".into()),
                        ..Default::default()
                    });
                    std::mem::forget(guard);
                }
            }

            // Auto-updater plugin (release only). Registration is gated behind
            // `not(debug_assertions)` because the plugin requires a valid
            // pubkey + signed `latest.json` endpoint to initialize, which we
            // don't want to depend on during development.
            #[cfg(not(debug_assertions))]
            {
                let _ = handle.plugin(tauri_plugin_updater::Builder::new().build());
            }

            // Schedule startup + periodic update checks when the user has
            // opted in. `"auto"` and `"manual"` both schedule a background
            // probe — the only difference is that `auto_install` is set for
            // `"auto"`, which triggers the plugin's download-and-restart
            // flow. `"off"` skips scheduling entirely. In debug builds the
            // helper falls through to the GitHub fallback automatically.
            let auto_update = config.settings().auto_update.clone();
            if auto_update != "off" {
                let auto_install = auto_update == "auto";
                let check_handle = handle.clone();
                tauri::async_runtime::spawn(async move {
                    // One-shot startup check after a ~10s delay so it doesn't
                    // compete with the initial paint + provider hydration.
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    crate::update::run_update_check(
                        check_handle.clone(),
                        auto_install,
                        false,
                        None,
                    )
                    .await;

                    // Then every 4h for the rest of the app's lifetime.
                    let mut interval =
                        tokio::time::interval(std::time::Duration::from_secs(4 * 60 * 60));
                    // The first tick fires immediately — skip it since we
                    // just ran the check above.
                    interval.tick().await;
                    loop {
                        interval.tick().await;
                        crate::update::run_update_check(
                            check_handle.clone(),
                            auto_install,
                            false,
                            None,
                        )
                        .await;
                    }
                });
            }

            // Build a watcher and subscribe to every known repo. Failures here
            // shouldn't block startup — live-updates are a nice-to-have, not
            // load-bearing; the UI still has an explicit Refresh button.
            let watcher_handle = handle.clone();
            let repo_records: Vec<(String, std::path::PathBuf)> = config
                .settings()
                .repos
                .values()
                .map(|r| (r.id.clone(), r.path.clone()))
                .collect();
            let watcher_slot = Arc::new(Mutex::new(None::<RepoWatcher>));
            {
                let watcher_slot = Arc::clone(&watcher_slot);
                tauri::async_runtime::spawn(async move {
                    match RepoWatcher::new(watcher_handle) {
                        Ok(mut watcher) => {
                            for (id, path) in repo_records {
                                if let Err(err) = watcher.watch_repo(&id, &path).await {
                                    tracing::warn!("watch_repo failed for {id}: {err}");
                                }
                            }
                            *watcher_slot.lock().await = Some(watcher);
                        }
                        Err(err) => tracing::warn!("RepoWatcher init failed: {err}"),
                    }
                });
            }

            // Only hide on startup when the OS-level autostart entry launched
            // us with `--start-minimized`. Manual launches (Spotlight, Dock,
            // double-click, CLI) never have the arg and therefore always show
            // the window — even if `startMinimized` is true in settings.
            let autostart_launch = std::env::args().any(|a| a == "--start-minimized");
            let start_minimized = autostart_launch && config.settings().start_minimized;
            let close_to_tray = config.settings().close_to_tray;

            // Hydrate each provider with any persisted self-hosted base URL so
            // the first API call after startup already targets the right
            // endpoint (rather than defaulting to the cloud URL until the user
            // re-enters the setting).
            let registry = ProviderRegistry::with_defaults();
            let provider_settings = config.settings().provider_settings.clone();
            for (pid, prov_settings) in &provider_settings {
                if let Some(provider) = registry.get(pid) {
                    let base = prov_settings.base_url.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = provider.set_base_url(base).await;
                    });
                }
            }

            // Snapshot the persisted translucency settings before `config`
            // moves into the AppState so the boot replay below can re-apply
            // the OS vibrancy material on the freshly-created main window. We
            // ALSO snapshot the resolved dark/light bit so the vibrancy view's
            // appearance matches the active theme on first paint.
            let translucency_enabled = config.settings().appearance.translucency.enabled;
            let translucency_intensity = config.settings().appearance.translucency.intensity;
            let translucency_dark = {
                let appearance = &config.settings().appearance;
                if appearance.follows_system {
                    #[cfg(target_os = "macos")]
                    {
                        macos_system_dark().unwrap_or(false)
                    }
                    #[cfg(not(target_os = "macos"))]
                    {
                        false
                    }
                } else {
                    appearance.theme_id == "dark"
                }
            };

            let state = AppState {
                config: Arc::new(Mutex::new(config)),
                providers: Arc::new(registry),
                watcher: watcher_slot,
                oauth_pending: Arc::new(Mutex::new(None)),
                ssh_passphrases: Arc::new(Mutex::new(HashMap::new())),
            };
            app.manage(state);

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;

                // (Process name is set at the very top of `run()` — calling
                // it here would be too late, the Dock has already captured
                // the cached lowercase binary name by this point.)

                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.set_decorations(true);
                    let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
                    // Force the WebView's native backing layer to fully
                    // transparent so that during Stage-Manager / Cmd-Tab
                    // re-focus events macOS doesn't briefly composite an
                    // opaque WKWebView background between the OS window flip
                    // and the next React paint. Without this, the user sees
                    // a white-then-translucent flash every time the app
                    // regains focus. Safe under any theme — React paints its
                    // own surfaces on top so an opaque theme still looks
                    // opaque, but the WebView itself never contributes a
                    // background colour.
                    let _ = window.set_background_color(None);
                    // Keep the webview rendering when backgrounded / in a
                    // Stage Manager group so its content stays fresh and it
                    // never shows a blank layer on refocus.
                    disable_webview_occlusion_detection(&window);
                    // No unconditional vibrancy — the orthogonal translucency
                    // effect toggles NSVisualEffectView on/off via
                    // `set_translucency` (window-vibrancy). Leaving vibrancy
                    // permanently on under opaque themes was wasteful (the
                    // compositor still blurs the window buffer behind solid
                    // React surfaces).
                }

                // Defer the initial icon set by 500ms so NSApp.effectiveAppearance
                // has settled — it lags the system appearance for the first
                // ~hundreds of ms after launch on macOS, the same WebKit cold-start
                // quirk that makes matchMedia("(prefers-color-scheme: dark)")
                // return false even on dark systems. Setting the icon too early
                // picks the wrong variant, which the Dock then visually caches —
                // subsequent correct `setApplicationIconImage` calls (driven by
                // the poller) update NSApp's internal state but the Dock keeps
                // showing the cached pixels. We deliberately don't also call
                // `set_macos_app_icon()` synchronously here: doubling the call
                // before the dock has settled tends to make caching worse.
                let handle_for_initial = handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    let _ = handle_for_initial.run_on_main_thread(set_macos_app_icon);
                });

                spawn_macos_appearance_poller(handle.clone());
            }

            // Re-apply the OS vibrancy material on boot if the user had
            // translucency on last session. Without this the first React
            // render fires the `set_translucency` IPC but macOS' window
            // snapshot is captured BEFORE that lands — a transparent first
            // frame in Stage Manager / Dock previews. Applying it here in Rust
            // setup keeps the NSVisualEffectView attached from the moment the
            // window's NSWindow is composed.
            if translucency_enabled {
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = commands::theme::apply_translucency(
                        &handle,
                        &window,
                        translucency_intensity,
                        translucency_dark,
                    );
                }
            }

            // Initial Windows icon swap runs AFTER the tray is created
            // further down so `apply_windows_theme_icon` finds both the
            // webview window and the tray. The tray block below calls it.

            // Deep-link listener for the OAuth callback. The handler only
            // re-emits the URL to the renderer; CSRF matching + token exchange
            // happens in `complete_oauth` so the sensitive work stays in Rust.
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let deep_handle = handle.clone();
                let callback_prefix = identity::current_oauth_callback_prefix();
                handle.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        let s = url.as_str();
                        if s.starts_with(&callback_prefix) {
                            let _ = tauri::Emitter::emit(
                                &deep_handle,
                                commands::oauth::OAUTH_CALLBACK_EVENT,
                                serde_json::json!({ "url": s }),
                            );
                        }
                    }
                });
            }

            // Honour the "Start minimized" preference — hide the main window to
            // the tray instead of showing it on boot.
            // Plan 1 §C.4: "Start minimized" needs to honour `closeToTray`.
            //   - both on  → hide to the tray (no taskbar entry).
            //   - start_minimized + close_to_tray=false → minimize into the
            //     taskbar (still visible, just collapsed).
            //   - start_minimized=false → leave the window visible (default).
            if start_minimized {
                if let Some(w) = handle.get_webview_window("main") {
                    if close_to_tray {
                        // Hide entirely; user surfaces it via tray icon or
                        // (on macOS) Spotlight reopen — see §C.1.
                        let _ = w.set_skip_taskbar(true);
                        let _ = w.hide();
                    } else {
                        // Real "minimize to taskbar" so user has a Windows-
                        // standard reentry point.
                        let _ = w.minimize();
                    }
                }
            }

            // System tray with Show / Hide / Quit menu + left-click to show.
            let show_i = MenuItem::with_id(app, "show", "Show Recrest", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Recrest", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &separator, &quit_i])?;

            // Tray uses a dedicated transparent icon set rather than the
            // bundle icon. On macOS it's marked as a template image so the
            // menu bar auto-tints with light/dark appearance; on Windows the
            // initial variant follows the current OS theme and is re-applied
            // by `apply_windows_theme_icon` on subsequent theme changes.
            #[cfg(target_os = "macos")]
            let tray_image = tauri::image::Image::from_bytes(tray_icon_bytes())
                .expect("tray icon bytes must decode");
            #[cfg(all(unix, not(target_os = "macos")))]
            let tray_image = tauri::image::Image::from_bytes(tray_icon_bytes())
                .expect("tray icon bytes must decode");
            #[cfg(windows)]
            let tray_image =
                tauri::image::Image::from_bytes(tray_icon_bytes(windows_uses_dark_mode()))
                    .expect("tray icon bytes must decode");

            let tray_builder = TrayIconBuilder::with_id(commands::tray::TRAY_ID)
                .icon(tray_image)
                .tooltip(identity::current_tray_tooltip())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main_window(app),
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });

            // macOS menu-bar convention: a single left-click opens the menu
            // immediately (like Wi-Fi, Battery, Spotlight). Also flag the
            // icon as a template so the menu bar auto-tints it to match
            // light/dark menu-bar appearance.
            #[cfg(target_os = "macos")]
            let tray_builder = tray_builder
                .show_menu_on_left_click(true)
                .icon_as_template(true);

            // Windows + Linux convention: left-click brings the window
            // forward, right-click opens the menu.
            #[cfg(not(target_os = "macos"))]
            let tray_builder = tray_builder
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });

            let _tray = tray_builder.build(app)?;

            // Plan 1 §C.2: install the WM_NCHITTEST subclass on the main
            // HWND so Windows 11 surfaces the Snap-Layouts flyout when the
            // cursor hovers the maximize button. The frontend will push
            // the actual button rectangles via `set_caption_button_bounds`
            // once the React titlebar is mounted.
            #[cfg(windows)]
            {
                if let Some(window) = handle.get_webview_window("main") {
                    match window.hwnd() {
                        Ok(hwnd) => {
                            let raw = windows::Win32::Foundation::HWND(hwnd.0 as *mut _);
                            // Re-assert WS_MAXIMIZEBOX so Windows 11 surfaces the
                            // Snap-Layouts flyout when the hit-test reports
                            // HTMAXBUTTON over our custom maximize button.
                            platform::windows::ensure_caption_styles(raw);
                            platform::windows::install_subclass(raw);
                        }
                        Err(err) => tracing::warn!("could not get main HWND for subclass: {err}"),
                    }
                }
                // Initial taskbar+tray icon swap to match the current OS
                // theme. Tauri only emits `WindowEvent::ThemeChanged` on
                // subsequent toggles, so this seeds the right variant at
                // startup; otherwise dark-mode users would see the light
                // icon flash until they alt-tab or change theme.
                apply_windows_theme_icon(&handle);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Focus events power the renderer's compositor-warmup probe
            // (see `main.tsx`). DOM `focus` / `blur` aren't reliable inside
            // a WKWebView host — Tauri's native `WindowEvent::Focused` is.
            // We emit a synthetic FE event the renderer can listen to.
            if let tauri::WindowEvent::Focused(focused) = event {
                let _ = tauri::Emitter::emit(
                    window,
                    if *focused {
                        "recrest://window-focused"
                    } else {
                        "recrest://window-blurred"
                    },
                    (),
                );
            }

            #[cfg(windows)]
            if let tauri::WindowEvent::ThemeChanged(_) = event {
                // OS theme flipped (light↔dark). Re-apply both window and
                // tray icons so the taskbar tile stays in sync with Explorer.
                apply_windows_theme_icon(window.app_handle());
            }

            // macOS does NOT hook `WindowEvent::ThemeChanged` — tao only
            // emits it for explicit per-window overrides, not system
            // appearance flips. The poller spawned in `setup` handles all
            // macOS dock-icon updates instead.

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Persist window geometry before a possible hide-to-tray below.
                // `tauri-plugin-window-state` otherwise only saves on a real
                // close, so saving explicitly here means the last on-screen
                // size/position/maximized/fullscreen survives a later force-quit
                // while the app sits in the tray. VISIBLE is deliberately
                // excluded so we never persist the hidden state and restore the
                // window invisible on next launch.
                {
                    use tauri_plugin_window_state::{AppHandleExt, StateFlags};
                    let _ = window.app_handle().save_window_state(
                        StateFlags::SIZE
                            | StateFlags::POSITION
                            | StateFlags::MAXIMIZED
                            | StateFlags::FULLSCREEN,
                    );
                }

                let app_handle = window.app_handle();
                let close_to_tray = match app_handle.try_state::<AppState>() {
                    Some(state) => match state.config.try_lock() {
                        Ok(cfg) => cfg.settings().close_to_tray,
                        Err(_) => false,
                    },
                    None => false,
                };

                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
                // else: fall through — let the OS close the window, then the
                // app exits because the webview was the only window.
            }
        });

    // `tauri::generate_handler!` cannot accept `#[cfg]` attrs on individual
    // arms, so we duplicate the handler registration — release builds get the
    // production command list, debug builds additionally expose the three
    // `commands::dev::*` helpers used by the Developer settings tab. The
    // `dev` module itself is `#![cfg(debug_assertions)]` so release builds
    // don't even link it.
    #[cfg(not(debug_assertions))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        commands::repos::scan_repos,
        commands::repos::list_repos,
        commands::repos::repo_status,
        commands::repos::add_repo,
        commands::repos::remove_repo,
        commands::repos::forget_repos_under_path,
        commands::repos::delete_repo,
        commands::repos::list_recent_commits,
        commands::repos::list_commits,
        commands::repos::get_oldest_commit_date,
        commands::repos::load_logo_bytes,
        commands::repos::set_repo_logo,
        commands::repos::set_repo_logo_svg,
        commands::repos::clear_repo_logo,
        commands::repos::open_in_ide,
        commands::repos::open_file_in_ide,
        commands::ide::detect_ides,
        commands::terminal::detect_terminals,
        commands::terminal::detect_shells,
        commands::terminal::test_custom_terminal,
        commands::discovery::list_terminals,
        commands::discovery::list_ides,
        commands::repos::open_terminal,
        commands::ssh::ssh_unlock_key,
        commands::ssh::set_repo_ssh_key,
        commands::ssh::list_ssh_keys,
        commands::git_ops::open_in_explorer,
        commands::git_ops::git_fetch,
        commands::git_ops::git_fetch_all,
        commands::git_ops::git_pull,
        commands::git_ops::git_push,
        commands::git_ops::git_checkout,
        commands::git_ops::git_checkout_remote,
        commands::git_ops::git_list_branches,
        commands::git_ops::git_branch_create,
        commands::git_ops::git_branch_delete,
        commands::git_ops::git_merge,
        commands::git_index::git_stage,
        commands::git_index::git_unstage,
        commands::git_index::git_discard,
        commands::git_index::git_stash,
        commands::git_index::git_stash_list,
        commands::git_index::git_stash_pop,
        commands::git_index::git_stash_drop,
        commands::git_index::git_commit,
        commands::git_index::git_has_pre_commit_hook,
        commands::git_config::get_git_config,
        commands::git_config::set_git_config,
        commands::git_config::list_git_config_layers,
        commands::git_config::get_git_config_with_origins,
        commands::git_config::set_git_config_in_layer,
        commands::git_config::add_git_config_include,
        commands::git_config::remove_git_config_include,
        commands::clone::git_clone,
        commands::search::find_across_repos,
        commands::remote_import::list_remote_repositories,
        commands::remote_import::list_remote_organizations,
        commands::remote_import::clone_remote_repository,
        commands::remote_import::clone_remote_repositories_bulk,
        commands::remote_import::create_and_open_workspace,
        commands::providers::list_providers,
        commands::providers::set_provider_token,
        commands::providers::set_provider_base_url,
        commands::providers::clear_provider_token,
        commands::providers::fetch_pull_requests,
        commands::providers::get_pr_detail,
        commands::providers::get_pr_diff,
        commands::providers::post_pr_comment,
        commands::providers::merge_pull_request,
        commands::providers::list_workflows,
        commands::providers::list_workflow_runs,
        commands::providers::trigger_workflow,
        commands::providers::cancel_workflow_run,
        commands::providers::get_pages_status,
        commands::providers::ping_provider,
        commands::providers::verify_credentials,
        commands::activity::list_pr_events,
        commands::activity::list_check_runs,
        commands::notifications::notify,
        commands::oauth::begin_oauth,
        commands::oauth::complete_oauth,
        commands::settings::get_settings,
        commands::settings::update_settings,
        commands::settings::factory_reset,
        commands::fonts::list_custom_fonts,
        commands::fonts::upload_font,
        commands::fonts::delete_custom_font,
        commands::window::set_caption_button_bounds,
        commands::system::get_platform_info,
        commands::system::get_system_dark_mode,
        commands::system::get_system_facts,
        commands::system::get_data_sizes,
        commands::git_info::check_git,
        commands::theme::set_translucency,
        commands::theme::supports_translucency,
        commands::tray::update_tray_badge,
        commands::update::check_for_update,
        commands::update::install_update,
    ]);

    #[cfg(debug_assertions)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        commands::repos::scan_repos,
        commands::repos::list_repos,
        commands::repos::repo_status,
        commands::repos::add_repo,
        commands::repos::remove_repo,
        commands::repos::forget_repos_under_path,
        commands::repos::delete_repo,
        commands::repos::list_recent_commits,
        commands::repos::list_commits,
        commands::repos::get_oldest_commit_date,
        commands::repos::load_logo_bytes,
        commands::repos::set_repo_logo,
        commands::repos::set_repo_logo_svg,
        commands::repos::clear_repo_logo,
        commands::repos::open_in_ide,
        commands::repos::open_file_in_ide,
        commands::ide::detect_ides,
        commands::terminal::detect_terminals,
        commands::terminal::detect_shells,
        commands::terminal::test_custom_terminal,
        commands::discovery::list_terminals,
        commands::discovery::list_ides,
        commands::repos::open_terminal,
        commands::ssh::ssh_unlock_key,
        commands::ssh::set_repo_ssh_key,
        commands::ssh::list_ssh_keys,
        commands::git_ops::open_in_explorer,
        commands::git_ops::git_fetch,
        commands::git_ops::git_fetch_all,
        commands::git_ops::git_pull,
        commands::git_ops::git_push,
        commands::git_ops::git_checkout,
        commands::git_ops::git_checkout_remote,
        commands::git_ops::git_list_branches,
        commands::git_ops::git_branch_create,
        commands::git_ops::git_branch_delete,
        commands::git_ops::git_merge,
        commands::git_index::git_stage,
        commands::git_index::git_unstage,
        commands::git_index::git_discard,
        commands::git_index::git_stash,
        commands::git_index::git_stash_list,
        commands::git_index::git_stash_pop,
        commands::git_index::git_stash_drop,
        commands::git_index::git_commit,
        commands::git_index::git_has_pre_commit_hook,
        commands::git_config::get_git_config,
        commands::git_config::set_git_config,
        commands::git_config::list_git_config_layers,
        commands::git_config::get_git_config_with_origins,
        commands::git_config::set_git_config_in_layer,
        commands::git_config::add_git_config_include,
        commands::git_config::remove_git_config_include,
        commands::clone::git_clone,
        commands::search::find_across_repos,
        commands::remote_import::list_remote_repositories,
        commands::remote_import::list_remote_organizations,
        commands::remote_import::clone_remote_repository,
        commands::remote_import::clone_remote_repositories_bulk,
        commands::remote_import::create_and_open_workspace,
        commands::providers::list_providers,
        commands::providers::set_provider_token,
        commands::providers::set_provider_base_url,
        commands::providers::clear_provider_token,
        commands::providers::fetch_pull_requests,
        commands::providers::get_pr_detail,
        commands::providers::get_pr_diff,
        commands::providers::post_pr_comment,
        commands::providers::merge_pull_request,
        commands::providers::list_workflows,
        commands::providers::list_workflow_runs,
        commands::providers::trigger_workflow,
        commands::providers::cancel_workflow_run,
        commands::providers::get_pages_status,
        commands::providers::ping_provider,
        commands::providers::verify_credentials,
        commands::activity::list_pr_events,
        commands::activity::list_check_runs,
        commands::notifications::notify,
        commands::oauth::begin_oauth,
        commands::oauth::complete_oauth,
        commands::settings::get_settings,
        commands::settings::update_settings,
        commands::settings::factory_reset,
        commands::fonts::list_custom_fonts,
        commands::fonts::upload_font,
        commands::fonts::delete_custom_font,
        commands::window::set_caption_button_bounds,
        commands::system::get_platform_info,
        commands::system::get_system_dark_mode,
        commands::system::get_system_facts,
        commands::system::get_data_sizes,
        commands::git_info::check_git,
        commands::theme::set_translucency,
        commands::theme::supports_translucency,
        commands::tray::update_tray_badge,
        commands::update::check_for_update,
        commands::update::install_update,
        commands::dev::get_dev_paths,
        commands::dev::get_build_triple,
        commands::dev::dev_panic,
        commands::dev_log::dev_log,
    ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building recrest application");

    app.run(|_app_handle, _event| {
        // Plan 1 §C.1: macOS dispatches Spotlight / Dock launches against an
        // already-running app as `Reopen`, NOT `single_instance`. When the
        // user has closed the window to the tray (`hide()`), we'd otherwise
        // sit silent on relaunch. Bring the window forward instead so
        // cmd-space → "Recrest" → Enter actually surfaces the app.
        // Gated to macOS because `RunEvent::Reopen` only exists there.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = _event
        {
            show_main_window(_app_handle);
        }

        // Plan 1 §C.2: tear down the WM_NCHITTEST subclass so Windows
        // doesn't keep our function pointer alive past process exit. Most
        // critical for `tauri dev` where the binary reloads — without
        // this, the next launch would re-register over a dead pointer.
        #[cfg(windows)]
        if let tauri::RunEvent::Exit = _event {
            platform::windows::uninstall_subclass();
        }
    });
}
