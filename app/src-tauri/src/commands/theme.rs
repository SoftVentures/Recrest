use crate::commands::error::CommandError;
use tauri_plugin_liquid_glass::{LiquidGlassConfig, LiquidGlassExt};

/// Apply the platform's native glass effect to the given window. On macOS 26+
/// the plugin uses Apple's private `NSGlassEffectView` (real Liquid Glass);
/// on older macOS it falls back to `NSVisualEffectView` with the
/// `UnderWindowBackground` material — the only stock material that composites
/// the actual desktop wallpaper through the window instead of just blurring
/// whatever app sits behind it. Safe no-op on Windows / Linux.
///
/// Returns an error so the caller can log fault paths; the plugin itself
/// already main-thread-dispatches the native call, so this is safe from any
/// thread.
pub fn apply_glassy(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), CommandError> {
    app.liquid_glass()
        .set_effect(window, LiquidGlassConfig::default())
        .map_err(|e| CommandError::internal(format!("liquid-glass apply failed: {e}")))
}

/// Inverse of [`apply_glassy`] — clear the glass effect so the next theme
/// renders against an opaque surface.
pub fn clear_glassy(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), CommandError> {
    app.liquid_glass()
        .set_effect(
            window,
            LiquidGlassConfig {
                enabled: false,
                ..Default::default()
            },
        )
        .map_err(|e| CommandError::internal(format!("liquid-glass clear failed: {e}")))
}

/// Apply (or clear) the window effect that matches the renderer-chosen
/// theme id. Only the "glassy" id maps to the glass effect; every other id
/// clears it so an opaque theme renders correctly.
#[tauri::command]
pub fn set_theme_effect(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    theme: String,
) -> Result<(), CommandError> {
    if theme == "glassy" {
        apply_glassy(&app, &window)
    } else {
        clear_glassy(&app, &window)
    }
}

/// Capability check the renderer uses to hide the Glassy theme option on
/// platforms where the effect isn't supported. Always-on for macOS (Liquid
/// Glass on 26+, vibrancy fallback below); off on Windows / Linux where the
/// plugin is a documented no-op.
#[tauri::command]
pub fn supports_glassy() -> bool {
    cfg!(target_os = "macos")
}
