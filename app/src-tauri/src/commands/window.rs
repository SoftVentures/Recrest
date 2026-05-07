use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use super::error::CommandError;

/// Lightweight pixel rect used by the Win11 titlebar to push caption-button
/// bounds to the Win32 subclass (see `platform::windows::snap`). Kept in
/// this file rather than next to the subclass because it's also the IPC
/// boundary type — `CommandError`-style flat structs live with the
/// commands.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionButtonRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: f64,
    pub y: f64,
    pub is_maximized: bool,
}

pub const STORE_FILENAME: &str = "window-state.json";
pub const STORE_KEY: &str = "windowState";

fn store_err<E: std::fmt::Display>(e: E) -> CommandError {
    CommandError::internal(e.to_string())
}

#[tauri::command]
pub async fn save_window_state(app: AppHandle, state: WindowState) -> Result<(), CommandError> {
    let store = app.store(STORE_FILENAME).map_err(store_err)?;
    store.set(STORE_KEY, serde_json::to_value(&state)?);
    store.save().map_err(store_err)?;
    Ok(())
}

#[tauri::command]
pub async fn load_window_state(app: AppHandle) -> Result<Option<WindowState>, CommandError> {
    let store = app.store(STORE_FILENAME).map_err(store_err)?;
    match store.get(STORE_KEY) {
        Some(value) => Ok(Some(serde_json::from_value(value)?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn validate_window_position(
    app: AppHandle,
    state: WindowState,
) -> Result<WindowState, CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::not_found("main window"))?;

    let monitors = window.available_monitors().map_err(store_err)?;

    let visible = monitors.iter().any(|monitor| {
        let pos = monitor.position();
        let size = monitor.size();
        let left = pos.x as f64;
        let top = pos.y as f64;
        let right = left + size.width as f64;
        let bottom = top + size.height as f64;
        let cx = state.x + state.width / 2.0;
        let cy = state.y + state.height / 2.0;
        cx >= left && cx <= right && cy >= top && cy <= bottom
    });

    if visible {
        return Ok(state);
    }

    let primary = window
        .current_monitor()
        .map_err(store_err)?
        .ok_or_else(|| CommandError::not_found("monitor"))?;
    let size = primary.size();
    let pos = primary.position();
    let width = state.width.min(size.width as f64);
    let height = state.height.min(size.height as f64);
    Ok(WindowState {
        width,
        height,
        x: pos.x as f64 + (size.width as f64 - width) / 2.0,
        y: pos.y as f64 + (size.height as f64 - height) / 2.0,
        is_maximized: false,
    })
}

/// Push the current pixel bounds of the three caption buttons (min, max,
/// close) into the Win32 subclass so `WM_NCHITTEST` can answer
/// `HTMAXBUTTON`/etc. when the cursor hovers them — that's the trigger
/// Windows 11 needs to surface the Snap-Layouts flyout. On non-Windows
/// platforms this is a no-op so the frontend can call it unconditionally.
#[tauri::command]
#[allow(unused_variables)]
pub async fn set_caption_button_bounds(
    min: CaptionButtonRect,
    max: CaptionButtonRect,
    close: CaptionButtonRect,
) -> Result<(), CommandError> {
    #[cfg(windows)]
    {
        use crate::platform::windows::{set_caption_button_bounds as set_bounds, CaptionRect};
        set_bounds(
            CaptionRect {
                x: min.x,
                y: min.y,
                width: min.width,
                height: min.height,
            },
            CaptionRect {
                x: max.x,
                y: max.y,
                width: max.width,
                height: max.height,
            },
            CaptionRect {
                x: close.x,
                y: close.y,
                width: close.width,
                height: close.height,
            },
        );
    }
    Ok(())
}
