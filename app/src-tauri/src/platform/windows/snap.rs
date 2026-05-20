//! Snap-Layouts hover support for the Recrest titlebar.
//!
//! Windows 11 only opens the Snap-Layouts flyout when the OS detects that
//! the cursor is hovering the maximize button — and "the maximize button"
//! is identified purely through `WM_NCHITTEST` returning `HTMAXBUTTON`.
//! Because we draw our own titlebar inside the WebView, the WebView
//! intercepts mouse messages before the OS sees them; therefore we install
//! a `SetWindowSubclass` proc on the main HWND that:
//!   1. Translates the screen-space mouse coordinates from `WM_NCHITTEST`
//!      back into client-space.
//!   2. Tests them against caption-button bounds the React titlebar pushes
//!      over IPC (`set_caption_button_bounds`).
//!   3. Returns `HTMINBUTTON` / `HTMAXBUTTON` / `HTCLOSE` when there is a
//!      match; otherwise hands off to `DefSubclassProc` so Tauri's existing
//!      window plumbing keeps working.
//!
//! Subclasses stack via the `uIdSubclass` discriminator — we use a unique
//! id (`SUBCLASS_ID`) so we don't collide with Tauri's own subclass.

use std::sync::{Mutex, OnceLock};

use serde::Deserialize;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::ScreenToClient;
use windows::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClientRect, HTCLIENT, HTCLOSE, HTMAXBUTTON, HTMINBUTTON, WM_NCHITTEST,
};

/// Unique identifier for our subclass. Picked from the high range to avoid
/// clashing with Tauri / wry / WebView2 helper subclasses, which tend to
/// use small integers.
const SUBCLASS_ID: usize = 0x52_43_52_53; // "RCRS"

/// Pixel rectangle in client-space (DIPs at the window's current DPI). The
/// frontend pushes these straight from `getBoundingClientRect()`.
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Copy, Default)]
struct CaptionBounds {
    min: CaptionRect,
    max: CaptionRect,
    close: CaptionRect,
}

/// Process-wide store for the latest button bounds. We only ever have one
/// main window, so a single global (guarded by a Mutex) is enough — and
/// keeps the subclass proc trivially callable with no extra state plumbing.
fn caption_bounds() -> &'static Mutex<CaptionBounds> {
    static BOUNDS: OnceLock<Mutex<CaptionBounds>> = OnceLock::new();
    BOUNDS.get_or_init(|| Mutex::new(CaptionBounds::default()))
}

/// HWND of the window we subclassed, kept so `uninstall_subclass()` can
/// undo the install on `RunEvent::Exit`. Wrapped in `OnceLock<Mutex<…>>`
/// instead of a static `AtomicIsize` to keep the API typed.
fn installed_hwnd() -> &'static Mutex<Option<isize>> {
    static HWND_SLOT: OnceLock<Mutex<Option<isize>>> = OnceLock::new();
    HWND_SLOT.get_or_init(|| Mutex::new(None))
}

/// Update the current caption-button bounds. Called from the
/// `set_caption_button_bounds` Tauri command after the React titlebar
/// measures itself (initially + on every ResizeObserver tick).
pub fn set_caption_button_bounds(min: CaptionRect, max: CaptionRect, close: CaptionRect) {
    if let Ok(mut guard) = caption_bounds().lock() {
        *guard = CaptionBounds { min, max, close };
    }
}

fn point_in_rect(pt: POINT, rect: CaptionRect) -> bool {
    let x = pt.x as f64;
    let y = pt.y as f64;
    x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height
}

unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id_subclass: usize,
    _ref_data: usize,
) -> LRESULT {
    if msg == WM_NCHITTEST {
        // LPARAM packs (y << 16) | x as signed shorts in screen-space.
        let raw = lparam.0 as u32;
        let mut pt = POINT {
            x: (raw & 0xFFFF) as i16 as i32,
            y: ((raw >> 16) & 0xFFFF) as i16 as i32,
        };

        // Convert to client-space so we can compare against bounds the
        // React titlebar reports via `getBoundingClientRect()`.
        if ScreenToClient(hwnd, &mut pt).as_bool() {
            // Only short-circuit if the point also falls inside the
            // window's client rect — outside of it `DefSubclassProc` will
            // still return one of the resize-edge codes for us.
            let mut client = RECT::default();
            if GetClientRect(hwnd, &mut client).is_ok() {
                let inside_client = pt.x >= client.left
                    && pt.x < client.right
                    && pt.y >= client.top
                    && pt.y < client.bottom;
                if inside_client {
                    if let Ok(bounds) = caption_bounds().lock() {
                        if point_in_rect(pt, bounds.min) {
                            return LRESULT(HTMINBUTTON as isize);
                        }
                        if point_in_rect(pt, bounds.max) {
                            return LRESULT(HTMAXBUTTON as isize);
                        }
                        if point_in_rect(pt, bounds.close) {
                            return LRESULT(HTCLOSE as isize);
                        }
                    }
                    // Inside client area but not over a caption button —
                    // let WebView2 keep handling clicks normally.
                    return LRESULT(HTCLIENT as isize);
                }
            }
        }
    }
    DefSubclassProc(hwnd, msg, wparam, lparam)
}

/// Install the WM_NCHITTEST subclass on `hwnd`. Idempotent: calling this
/// twice with the same HWND would re-register over our existing subclass,
/// so we early-out if we already have one stored.
pub fn install_subclass(hwnd: HWND) {
    if let Ok(mut slot) = installed_hwnd().lock() {
        if slot.is_some() {
            return;
        }
        // SAFETY: `subclass_proc` is a valid extern "system" fn and `hwnd`
        // comes from Tauri's verified window handle. `SetWindowSubclass`
        // takes ownership of the function pointer for the window's
        // lifetime; we balance it with `RemoveWindowSubclass` in
        // `uninstall_subclass`.
        let ok = unsafe { SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, 0) };
        if ok.as_bool() {
            *slot = Some(hwnd.0 as isize);
        } else {
            tracing::warn!("SetWindowSubclass failed; Snap-Layouts hover will be disabled");
        }
    }
}

/// Remove the subclass installed by `install_subclass`. Safe to call even
/// if no subclass was installed.
pub fn uninstall_subclass() {
    if let Ok(mut slot) = installed_hwnd().lock() {
        if let Some(raw) = slot.take() {
            let hwnd = HWND(raw as *mut std::ffi::c_void);
            // SAFETY: matched with the earlier `SetWindowSubclass`; the
            // HWND is the original we installed against.
            unsafe {
                let _ = RemoveWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID);
            }
        }
    }
}
