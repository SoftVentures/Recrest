use crate::commands::error::CommandError;
use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

/// Apply the macOS native translucency: an `NSVisualEffectView` (the stock
/// vibrancy view) attached behind the transparent WKWebView.
///
/// History — why NOT NSGlassEffectView / `tauri-plugin-liquid-glass`:
/// the liquid-glass plugin auto-selects `NSGlassEffectView` (the macOS 26
/// "Liquid Glass" view) whenever the class is available. That view has a
/// confirmed Apple regression on macOS 26 where it flashes BLACK for one
/// frame during animated window transitions — including Stage Manager
/// swap-in and Cmd-Tab focus regain (see Apple Developer Forums
/// "Black Pixel Flicker When Using glassEffect() with Animation", and the
/// NSGlassEffectView caching bug threads). Runtime diagnostics confirmed
/// the plugin was attaching an NSGlassEffectView (our search for an
/// NSVisualEffectView in the hierarchy found zero), and the user saw
/// exactly that black flash in the translucent area on every focus regain.
///
/// `window-vibrancy`'s `apply_vibrancy` uses the decade-old, rock-stable
/// `NSVisualEffectView`. We use the `Sidebar` material (same one every
/// Finder/Mail/Notes sidebar uses) with `State::Active` so the blur renders
/// at full intensity regardless of window focus (keeps the glass look
/// consistent when the window sits in the background / a Stage Manager
/// group).
///
/// KNOWN ISSUE — Stage Manager black flicker: on macOS Tahoe (26) the
/// NSVisualEffectView (BehindWindow blending) flashes black for ~1 frame in
/// the see-through area during the Stage Manager swap-in animation. This was
/// exhaustively confirmed to be an OS-level behaviour, not app-fixable:
/// reproduced identically with NSGlassEffectView, NSVisualEffectView in both
/// `Active` and `FollowsWindowActiveState`, with WKWebView occlusion
/// detection disabled, and with the NSWindow backing forced clear — and it
/// vanished only when the OS material was removed entirely (which also
/// removes the desktop blur, since CSS `backdrop-filter` cannot blur the
/// desktop behind a transparent window). Tracked in
/// https://github.com/SoftVentures/Recrest/issues/85 — we keep the blur and
/// accept the flicker.
///
/// We DON'T tint here — the user-controlled rgba overlay lives on `<html>`
/// in CSS so the renderer keeps 1:1 control of the transparency slider.
///
/// `apply_vibrancy` is main-thread-only (returns `Error::NotMainThread`
/// otherwise) and Tauri commands run off the main thread, so we hop via
/// `run_on_main_thread`. We `clear_vibrancy` first so repeated calls
/// (every theme/settings change re-invokes this) don't stack multiple
/// blur views.
pub fn apply_translucency(
    _app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
    _intensity: u8,
    _dark: bool,
) -> Result<(), CommandError> {
    let win = window.clone();
    window
        .run_on_main_thread(move || {
            let _ = clear_vibrancy(&win);
            let _ = apply_vibrancy(
                &win,
                NSVisualEffectMaterial::Sidebar,
                Some(NSVisualEffectState::Active),
                None,
            );
        })
        .map_err(|e| CommandError::internal(format!("apply_translucency main-thread hop failed: {e}")))
}

/// Clear the translucency effect so the next theme renders against an opaque
/// surface. Inverse of [`apply_translucency`].
pub fn clear_translucency(
    _app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), CommandError> {
    let win = window.clone();
    window
        .run_on_main_thread(move || {
            let _ = clear_vibrancy(&win);
        })
        .map_err(|e| CommandError::internal(format!("clear_translucency main-thread hop failed: {e}")))
}

/// Apply (or clear) the OS-level translucency effect with the given intensity.
/// Orthogonal to `theme_id` — any theme can be made translucent on top.
/// Intensity is clamped to [0, 100] and mapped to a tint alpha on the
/// underlying liquid-glass material. `dark` picks the tint base colour so
/// the glass blends into the active palette.
#[tauri::command]
pub fn set_translucency(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    enabled: bool,
    intensity: u8,
    dark: bool,
) -> Result<(), CommandError> {
    if enabled {
        apply_translucency(&app, &window, intensity, dark)
    } else {
        clear_translucency(&app, &window)
    }
}

/// Capability check the renderer uses to hide the Translucency controls on
/// platforms where the effect isn't supported. Always-on for macOS (Liquid
/// Glass on 26+, vibrancy fallback below); off on Windows / Linux where the
/// plugin is a documented no-op.
#[tauri::command]
pub fn supports_translucency() -> bool {
    cfg!(target_os = "macos")
}
