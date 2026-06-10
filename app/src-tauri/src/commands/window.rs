use serde::{Deserialize, Serialize};

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
