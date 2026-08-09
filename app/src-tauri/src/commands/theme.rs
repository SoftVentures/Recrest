use crate::commands::error::CommandError;
#[cfg(target_os = "macos")]
use window_vibrancy::{
    apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial, NSVisualEffectState,
};

/// Apply the platform's translucency.
///
/// **macOS:** an `NSVisualEffectView` (the stock vibrancy view) attached behind
/// the transparent WKWebView, providing the actual desktop blur. We use the OS
/// material rather than CSS `backdrop-filter` because a CSS blur on a
/// transparent WKWebView window is unreliable — WebKit drops/recomputes the
/// layer on scroll (flicker) and lightens its edges (white shimmer). The
/// material's blur radius is fixed, so the renderer hides the blur-amount
/// slider on macOS (only the rgba intensity tint, which lives in CSS).
///
/// **Windows:** the Acrylic material (window-vibrancy `apply_acrylic`). A CSS
/// `backdrop-filter` is NOT viable here even though Chromium supports it — it
/// only blurs pixels inside Chromium's own compositor, and the desktop behind a
/// transparent window is composited by the Windows DWM, so the filter blurs
/// transparency and nothing is visible. The OS Acrylic blur is the equivalent of
/// the macOS material; the palette tint + intensity slider stay in CSS
/// (`::before` rgba). Acrylic's radius is fixed, so — like macOS — the renderer
/// hides the blur-amount slider on Windows.
///
/// **Linux / other:** nothing to attach — WebKitGTK has no reliable compositor
/// blur, and `supports_translucency` reports false there.
///
/// History — why NOT `NSGlassEffectView` / `tauri-plugin-liquid-glass`: that
/// plugin selects macOS 26's `NSGlassEffectView`, which has a confirmed Apple
/// regression that flashes BLACK for one frame on animated window transitions.
/// We use `window-vibrancy`'s `NSVisualEffectView` (`Sidebar` material,
/// `State::Active`).
///
/// KNOWN ISSUE — Stage Manager black flicker (#85): on macOS Tahoe the
/// NSVisualEffectView still flashes black for ~1 frame during the Stage Manager
/// swap-in animation. Proven OS-level, not app-fixable while keeping the blur.
/// Accepted; tracked at https://github.com/SoftVentures/Recrest/issues/85.
///
/// On macOS the blur must follow the **app** theme (dark app → dark blur, light
/// app → light blur), not the system: an `NSVisualEffectView` inherits its
/// window's effective appearance, so we pin the vibrancy *view's* own
/// appearance per the `dark` flag (see `set_vibrancy_appearance`).
///
/// `apply_vibrancy` is main-thread-only and Tauri commands run off the main
/// thread, so we hop via `run_on_main_thread`. We `clear_vibrancy` first so
/// repeated calls don't stack multiple blur views.
pub fn apply_translucency(
    _app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
    _intensity: u8,
    dark: bool,
) -> Result<(), CommandError> {
    #[cfg(target_os = "macos")]
    {
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
                set_vibrancy_appearance(&win, dark);
            })
            .map_err(|e| {
                CommandError::internal(format!("apply_translucency main-thread hop failed: {e}"))
            })?;
    }
    #[cfg(target_os = "windows")]
    {
        // Blur at the OS level via the Acrylic system-backdrop — a CSS
        // backdrop-filter over a transparent window can't reach the
        // DWM-composited desktop, so it blurs nothing (the bug this fixes).
        // The helper extends the borderless window's frame so DWM actually
        // paints the backdrop, and pins the frost's light/dark appearance to
        // the APP theme (`dark`) instead of the Windows system theme. The CSS
        // `::before` rgba layer carries the palette tint + opacity slider.
        crate::platform::windows::apply_acrylic_backdrop(window, dark);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // Linux/other: translucency is unsupported (no reliable compositor blur).
        let _ = (window, dark);
    }
    Ok(())
}

/// Pin the appearance of the `NSVisualEffectView` that `apply_vibrancy` just
/// attached to match the app theme (`dark`), independent of the window/system
/// appearance. Setting the view's own `appearance` overrides the inherited
/// effective appearance for that view only. Main-thread only (caller hops).
#[cfg(target_os = "macos")]
fn set_vibrancy_appearance(window: &tauri::WebviewWindow, dark: bool) {
    use objc2::runtime::{AnyClass, AnyObject, Bool};
    use objc2::{class, msg_send};
    use objc2_foundation::NSString;

    let Ok(raw_handle) = window.ns_window() else {
        return;
    };
    if raw_handle.is_null() {
        return;
    }
    // SAFETY: we're on the main thread (caller hops via run_on_main_thread) and
    // the pointer is the live NSWindow from Tauri.
    unsafe {
        let ns_window = raw_handle as *mut AnyObject;
        let content_view: *mut AnyObject = msg_send![ns_window, contentView];
        if content_view.is_null() {
            return;
        }
        let Some(vev_class) = AnyClass::get(c"NSVisualEffectView") else {
            return;
        };

        // window-vibrancy inserts the effect view relative to the contentView;
        // search from the contentView's superview (the window frame) down so we
        // find it whether it's a sibling of or nested under the contentView.
        fn find_view(view: *mut AnyObject, class: &AnyClass) -> Option<*mut AnyObject> {
            if view.is_null() {
                return None;
            }
            unsafe {
                let is_kind: Bool = msg_send![view, isKindOfClass: class];
                if is_kind.as_bool() {
                    return Some(view);
                }
                let subviews: *mut AnyObject = msg_send![view, subviews];
                if subviews.is_null() {
                    return None;
                }
                let count: usize = msg_send![subviews, count];
                for i in 0..count {
                    let sub: *mut AnyObject = msg_send![subviews, objectAtIndex: i];
                    if let Some(found) = find_view(sub, class) {
                        return Some(found);
                    }
                }
            }
            None
        }

        let superview: *mut AnyObject = msg_send![content_view, superview];
        let root = if superview.is_null() {
            content_view
        } else {
            superview
        };
        let Some(effect_view) = find_view(root, vev_class) else {
            return;
        };

        let name = NSString::from_str(if dark {
            "NSAppearanceNameDarkAqua"
        } else {
            "NSAppearanceNameAqua"
        });
        let appearance: *mut AnyObject = msg_send![class!(NSAppearance), appearanceNamed: &*name];
        let _: () = msg_send![effect_view, setAppearance: appearance];
    }
}

/// Clear the translucency effect. macOS detaches the vibrancy view; other
/// platforms have nothing native attached (CSS-only).
pub fn clear_translucency(
    _app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), CommandError> {
    #[cfg(target_os = "macos")]
    {
        let win = window.clone();
        window
            .run_on_main_thread(move || {
                let _ = clear_vibrancy(&win);
            })
            .map_err(|e| {
                CommandError::internal(format!("clear_translucency main-thread hop failed: {e}"))
            })?;
    }
    #[cfg(target_os = "windows")]
    {
        crate::platform::windows::clear_acrylic_backdrop(window);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = window;
    }
    Ok(())
}

/// Apply (or clear) the OS-level translucency effect. Orthogonal to `theme_id`.
/// `intensity` drives the CSS rgba tint on the renderer side; `dark` selects the
/// macOS vibrancy view's appearance so the blur matches the app theme.
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

/// Capability check the renderer uses to show/hide the Translucency controls.
/// macOS: native NSVisualEffectView. Windows: OS Acrylic material (both blur at
/// the compositor level — a CSS backdrop-filter can't reach the desktop behind a
/// transparent window). Off on Linux where WebKitGTK has no reliable compositor
/// blur.
#[tauri::command]
pub fn supports_translucency() -> bool {
    cfg!(target_os = "macos") || cfg!(target_os = "windows")
}
