mod auth;
mod commands;
mod config;
mod git;
mod providers;

use std::sync::Arc;

use tokio::sync::Mutex;
use tracing_subscriber::EnvFilter;

use crate::config::store::ConfigStore;
use crate::providers::registry::ProviderRegistry;

/// Shared application state made available to every Tauri command.
pub struct AppState {
    pub config: Arc<Mutex<ConfigStore>>,
    pub providers: Arc<ProviderRegistry>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let config = ConfigStore::load_or_default(&handle)?;
            let state = AppState {
                config: Arc::new(Mutex::new(config)),
                providers: Arc::new(ProviderRegistry::with_defaults()),
            };
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::repos::scan_repos,
            commands::repos::list_repos,
            commands::repos::repo_status,
            commands::repos::add_repo,
            commands::repos::remove_repo,
            commands::repos::open_in_ide,
            commands::providers::list_providers,
            commands::providers::set_provider_token,
            commands::providers::clear_provider_token,
            commands::providers::fetch_pull_requests,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running recrest application");
}
