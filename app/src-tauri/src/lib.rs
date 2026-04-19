mod auth;
mod commands;
mod config;
mod git;
mod providers;

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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    tauri::Builder::default()
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
            // Crash reporting — opt-in via SENTRY_DSN at compile time, production only.
            #[cfg(not(debug_assertions))]
            let _sentry_guard = sentry::init(sentry::ClientOptions {
                dsn: option_env!("SENTRY_DSN").and_then(|s| s.parse().ok()),
                release: Some(env!("CARGO_PKG_VERSION").into()),
                environment: Some("production".into()),
                ..Default::default()
            });

            // Logging is handled by `tracing_subscriber` above; we don't register
            // `tauri_plugin_log` because its `env_logger` sink would clash with
            // tracing's global dispatcher (only one logger can be installed).

            // Auto-updater plugin (release only — requires endpoint config).
            #[cfg(not(debug_assertions))]
            {
                let _ = app
                    .handle()
                    .plugin(tauri_plugin_updater::Builder::new().build());
            }

            let handle = app.handle().clone();
            let config = ConfigStore::load_or_default(&handle)?;

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

            let state = AppState {
                config: Arc::new(Mutex::new(config)),
                providers: Arc::new(ProviderRegistry::with_defaults()),
                watcher: watcher_slot,
            };
            app.manage(state);

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
        .invoke_handler(tauri::generate_handler![
            commands::repos::scan_repos,
            commands::repos::list_repos,
            commands::repos::repo_status,
            commands::repos::add_repo,
            commands::repos::remove_repo,
            commands::repos::list_recent_commits,
            commands::repos::load_logo_bytes,
            commands::repos::open_in_ide,
            commands::repos::open_terminal,
            commands::git_ops::open_in_explorer,
            commands::git_ops::git_fetch,
            commands::git_ops::git_fetch_all,
            commands::git_ops::git_pull,
            commands::git_ops::git_push,
            commands::git_ops::git_checkout,
            commands::providers::list_providers,
            commands::providers::set_provider_token,
            commands::providers::clear_provider_token,
            commands::providers::fetch_pull_requests,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::window::save_window_state,
            commands::window::load_window_state,
            commands::window::validate_window_position,
            commands::system::get_platform_info,
            commands::git_info::check_git,
            commands::tray::update_tray_badge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running recrest application");
}
