//! Windows 11 Acrylic system-backdrop for the translucency effect.
//!
//! `window-vibrancy`'s `apply_acrylic` sets the DWM `SYSTEMBACKDROP_TYPE`
//! attribute (Acrylic, `DWMSBT_TRANSIENTWINDOW`) on Windows 11 build 22523+.
//! But DWM only paints a system backdrop in the region where the (non-client)
//! window frame extends into the client area. Our main window is borderless
//! (`decorations: false`), so its frame is zero-width and the backdrop renders
//! nowhere — the attribute is set yet the user sees a transparent window with
//! NO blur (the exact symptom we hit). The documented fix is to extend the
//! frame across the whole client area ("sheet of glass", margins all `-1`) via
//! `DwmExtendFrameIntoClientArea` before flipping the backdrop attribute.
//!
//! On older builds `window-vibrancy` falls back to the legacy
//! `SetWindowCompositionAttribute` blur, which doesn't need the frame
//! extension — extending it there is harmless, so this single path covers both.

use std::ffi::c_void;

use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
    DwmExtendFrameIntoClientArea, DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
};
use windows::Win32::UI::Controls::MARGINS;

/// All-`-1` margins ask DWM to treat the entire client area as frame, so the
/// system backdrop fills the whole borderless window.
const SHEET_OF_GLASS: MARGINS = MARGINS {
    cxLeftWidth: -1,
    cxRightWidth: -1,
    cyTopHeight: -1,
    cyBottomHeight: -1,
};

const NO_GLASS: MARGINS = MARGINS {
    cxLeftWidth: 0,
    cxRightWidth: 0,
    cyTopHeight: 0,
    cyBottomHeight: 0,
};

fn hwnd_of(window: &tauri::WebviewWindow) -> Option<HWND> {
    // Tauri returns its own `windows` re-export; rebuild our crate's HWND from
    // the raw pointer (mirrors `lib.rs::apply_windows_theme_icon`).
    window.hwnd().ok().map(|raw| HWND(raw.0 as *mut _))
}

fn extend_frame(hwnd: HWND, margins: &MARGINS) {
    // SAFETY: `hwnd` is Tauri's live main-window handle; this only adjusts the
    // DWM frame margins — it never resizes, moves, or frees the window.
    unsafe {
        let _ = DwmExtendFrameIntoClientArea(hwnd, margins);
    }
}

/// Pin the DWM backdrop's light/dark appearance to the APP theme rather than
/// the Windows system theme. `window-vibrancy`'s `apply_acrylic` never touches
/// `DWMWA_USE_IMMERSIVE_DARK_MODE`, so the Acrylic tint otherwise follows the
/// system — a dark app on a light Windows would get a light frost. Setting it
/// makes the frost match the app (dark app → dark frost).
fn set_dark_mode(hwnd: HWND, dark: bool) {
    let enabled: i32 = i32::from(dark);
    // SAFETY: writes a 4-byte BOOL DWM attribute on Tauri's live main window.
    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &enabled as *const i32 as *const c_void,
            std::mem::size_of::<i32>() as u32,
        );
    }
}

/// Attach the Acrylic backdrop (theme pin + frame extension + backdrop
/// attribute). `dark` is the APP's effective dark-mode bit.
pub fn apply_acrylic_backdrop(window: &tauri::WebviewWindow, dark: bool) {
    let Some(hwnd) = hwnd_of(window) else {
        tracing::warn!("[windows] acrylic: hwnd() unavailable, skipping backdrop");
        return;
    };
    set_dark_mode(hwnd, dark);
    extend_frame(hwnd, &SHEET_OF_GLASS);
    // `None` lets DWM use its default Acrylic tint (the legacy SWCA fallback
    // bumps a 0-alpha to 1 internally); the dark/light bias is set above. The
    // palette tint + opacity slider are carried by the CSS `::before` rgba
    // layer, mirroring the macOS model.
    match window_vibrancy::apply_acrylic(window, None) {
        Ok(()) => tracing::info!("[windows] acrylic backdrop applied (dark={dark}, frame extended)"),
        Err(e) => tracing::warn!("[windows] apply_acrylic failed: {e:?}"),
    }
}

/// Detach the Acrylic backdrop and collapse the frame back.
pub fn clear_acrylic_backdrop(window: &tauri::WebviewWindow) {
    if let Err(e) = window_vibrancy::clear_acrylic(window) {
        tracing::warn!("[windows] clear_acrylic failed: {e:?}");
    }
    if let Some(hwnd) = hwnd_of(window) {
        extend_frame(hwnd, &NO_GLASS);
    }
}
