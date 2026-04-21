mod auth;
mod commands;
mod config;
mod git;
mod providers;
mod update;

use std::sync::Arc;

use tauri::{
    Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use tracing_subscriber::EnvFilter;

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
}

#[cfg(windows)]
fn set_app_user_model_id() {
    // Must match `tauri.conf.json::identifier` so future Start-Menu entries
    // (installer-written shortcuts) and this runtime setting address the
    // same notification channel.
    use windows_sys::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
    let aumid: Vec<u16> = "eu.softventures.recrest"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    // `SetCurrentProcessExplicitAppUserModelID` returns an HRESULT; failure
    // is non-fatal (notifications still work, just with the parent-process
    // name). Silently swallow so a weird Windows build doesn't crash boot.
    unsafe {
        let _ = SetCurrentProcessExplicitAppUserModelID(aumid.as_ptr());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    // GUI-gestartete Apps erben auf macOS/Linux nicht den interaktiven $PATH
    // aus dem User-Shell. Das ist der Hauptgrund, warum `open_in_ide` in
    // Prod-Builds oft fehlschlägt obwohl `code`/`cursor` im Terminal laufen.
    // fix-path-env repariert den PATH einmalig beim Start.
    let _ = fix_path_env::fix();

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

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Logging is handled by `tracing_subscriber` above; we don't register
            // `tauri_plugin_log` because its `env_logger` sink would clash with
            // tracing's global dispatcher (only one logger can be installed).

            let handle = app.handle().clone();
            let config = ConfigStore::load_or_default(&handle)?;

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
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(
                        4 * 60 * 60,
                    ));
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

            let start_minimized = config.settings().start_minimized;

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

            let state = AppState {
                config: Arc::new(Mutex::new(config)),
                providers: Arc::new(registry),
                watcher: watcher_slot,
                oauth_pending: Arc::new(Mutex::new(None)),
            };
            app.manage(state);

            // Deep-link listener for the OAuth callback. The handler only
            // re-emits the URL to the renderer; CSRF matching + token exchange
            // happens in `complete_oauth` so the sensitive work stays in Rust.
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let deep_handle = handle.clone();
                handle.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        let s = url.as_str();
                        if s.starts_with("recrest://oauth/callback") {
                            let _ = tauri::Emitter::emit(
                                &deep_handle,
                                "oauth://callback",
                                serde_json::json!({ "url": s }),
                            );
                        }
                    }
                });
            }

            // Honour the "Start minimized" preference — hide the main window to
            // the tray instead of showing it on boot.
            if start_minimized {
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            // System tray with Show / Hide / Quit menu + left-click to show.
            let show_i = MenuItem::with_id(app, "show", "Show Recrest", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Recrest", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &separator, &quit_i])?;

            let _tray = TrayIconBuilder::with_id(commands::tray::TRAY_ID)
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Recrest")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Persist window geometry before hiding, so it survives a force-quit.
                // Values are stored in LOGICAL pixels so the TS side (which
                // applies state via `LogicalSize`) sees a consistent space —
                // mixing physical/logical caused startup-time size jitter on
                // HiDPI displays.
                if let (Ok(position), Ok(size), Ok(scale)) = (
                    window.outer_position(),
                    window.outer_size(),
                    window.scale_factor(),
                ) {
                    let state = commands::window::WindowState {
                        width: size.width as f64 / scale,
                        height: size.height as f64 / scale,
                        x: position.x as f64 / scale,
                        y: position.y as f64 / scale,
                        is_maximized: window.is_maximized().unwrap_or(false),
                    };
                    if let Ok(store) = window.app_handle().store(commands::window::STORE_FILENAME) {
                        if let Ok(value) = serde_json::to_value(&state) {
                            store.set(commands::window::STORE_KEY, value);
                            let _ = store.save();
                        }
                    }
                }

                // Read the user preference synchronously from the managed state.
                // `close_to_tray = true` (default) hides; `false` actually exits.
                let app_handle = window.app_handle();
                let close_to_tray = match app_handle.try_state::<AppState>() {
                    Some(state) => match state.config.try_lock() {
                        Ok(cfg) => cfg.settings().close_to_tray,
                        Err(_) => true, // fall back to safer behaviour if locked
                    },
                    None => true,
                };

                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
                // else: fall through — let the OS close the window, then the
                // app exits because the webview was the only window.
            }
        })
        ;

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
        commands::repos::list_recent_commits,
        commands::repos::load_logo_bytes,
        commands::repos::open_in_ide,
        commands::ide::detect_ides,
        commands::repos::open_terminal,
        commands::git_ops::open_in_explorer,
        commands::git_ops::git_fetch,
        commands::git_ops::git_fetch_all,
        commands::git_ops::git_pull,
        commands::git_ops::git_push,
        commands::git_ops::git_checkout,
        commands::git_ops::git_checkout_remote,
        commands::git_ops::git_list_branches,
        commands::git_ops::git_branch_create,
        commands::git_ops::git_merge,
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
        commands::activity::list_pr_events,
        commands::activity::list_check_runs,
        commands::notifications::notify,
        commands::oauth::begin_oauth,
        commands::oauth::complete_oauth,
        commands::settings::get_settings,
        commands::settings::update_settings,
        commands::window::save_window_state,
        commands::window::load_window_state,
        commands::window::validate_window_position,
        commands::system::get_platform_info,
        commands::git_info::check_git,
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
        commands::repos::list_recent_commits,
        commands::repos::load_logo_bytes,
        commands::repos::open_in_ide,
        commands::ide::detect_ides,
        commands::repos::open_terminal,
        commands::git_ops::open_in_explorer,
        commands::git_ops::git_fetch,
        commands::git_ops::git_fetch_all,
        commands::git_ops::git_pull,
        commands::git_ops::git_push,
        commands::git_ops::git_checkout,
        commands::git_ops::git_checkout_remote,
        commands::git_ops::git_list_branches,
        commands::git_ops::git_branch_create,
        commands::git_ops::git_merge,
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
        commands::activity::list_pr_events,
        commands::activity::list_check_runs,
        commands::notifications::notify,
        commands::oauth::begin_oauth,
        commands::oauth::complete_oauth,
        commands::settings::get_settings,
        commands::settings::update_settings,
        commands::window::save_window_state,
        commands::window::load_window_state,
        commands::window::validate_window_position,
        commands::system::get_platform_info,
        commands::git_info::check_git,
        commands::tray::update_tray_badge,
        commands::update::check_for_update,
        commands::update::install_update,
        commands::dev::get_dev_paths,
        commands::dev::get_build_triple,
        commands::dev::dev_panic,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running recrest application");
}
