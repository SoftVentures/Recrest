//! Runtime clamping of the main window's geometry against the monitor it
//! actually lands on.
//!
//! `tauri.conf.json` can only express *wishes*: it has no syntax for "1280×800,
//! but never bigger than the screen". Two real-world setups break because of
//! that, and both were reported as "the UI does not adapt to the screen":
//!
//! * A 4K panel without effective scaling makes the 1280 px start width roughly
//!   a third of the screen — the app looks absurdly small.
//! * A 1920×1080 laptop at 200 % (`GDK_SCALE=2`) has a *logical* desktop of
//!   960×540, i.e. smaller than the 1100×720 minimum the config asks for. GTK
//!   enforces that minimum anyway, so the window is bigger than the screen and
//!   its edges — including the whole custom titlebar chrome — get cut off.
//!
//! Everything here therefore treats the config values as an upper bound and the
//! monitor work area as the hard ceiling.

use tauri::{LogicalSize, Monitor, Runtime, WebviewWindow};
use tauri_plugin_window_state::StateFlags;

/// Wished window geometry, mirrored from `app.windows[0]` in
/// `tauri.conf.json`. Duplicated in Rust because the clamping below needs a
/// landing size in Rust terms; keep the two in lock-step.
///
/// `DEFAULT_*` and the clamping helpers below are only reachable from
/// `clamp_size`, which is a no-op on macOS (see there). They stay compiled
/// everywhere so the unit tests — which exercise the pure arithmetic and are
/// platform-independent — keep running on every host.
#[cfg_attr(target_os = "macos", allow(dead_code))]
const DEFAULT_WIDTH: f64 = 1280.0;
#[cfg_attr(target_os = "macos", allow(dead_code))]
const DEFAULT_HEIGHT: f64 = 800.0;
const MIN_WIDTH: f64 = 1100.0;
const MIN_HEIGHT: f64 = 720.0;

/// Share of the work area a clamped window may occupy. The 10 % slack absorbs
/// what `work_area()` cannot see: on Linux Tauri derives it from
/// `gdk_monitor_get_workarea()`, and Wayland has no work-area protocol at all,
/// so GDK returns the *full* monitor geometry there and subtracts neither panels
/// nor docks. Server-side decorations and shadows are subtracted on no platform.
const WORK_AREA_FRACTION: f64 = 0.9;

/// Slack for the logical-pixel comparisons. `work_area()` arrives in physical
/// pixels and is divided by a float scale factor, so exact equality against a
/// window size that went through the same conversion is never reliable.
#[cfg_attr(target_os = "macos", allow(dead_code))]
const EPSILON: f64 = 1.0;

/// Usable desktop area of one monitor in **logical** pixels — the unit
/// `set_min_size`/`set_size` interpret a `LogicalSize` in.
#[derive(Debug, Clone, Copy)]
struct WorkArea {
    width: f64,
    height: f64,
}

impl WorkArea {
    /// Largest window we are willing to put on this monitor.
    fn ceiling(self) -> (f64, f64) {
        (
            self.width * WORK_AREA_FRACTION,
            self.height * WORK_AREA_FRACTION,
        )
    }
}

/// Flags `tauri-plugin-window-state` is allowed to persist and restore.
///
/// `POSITION` is deliberately absent on Linux. `tao` reads the window position
/// from `gdk_window.root_origin()` and writes it back via `gtk_window.move_()`;
/// under Wayland the former does not yield global coordinates and the latter is
/// a no-op, so the persisted value is noise. The plugin feeds exactly that value
/// into its `Monitor::intersects` gate, which decides *which monitor* the window
/// is considered to live on — getting that wrong is worse than not restoring the
/// position at all. macOS and Windows keep the flag unchanged.
pub fn persisted_state_flags() -> StateFlags {
    #[cfg(target_os = "linux")]
    let position = StateFlags::empty();
    #[cfg(not(target_os = "linux"))]
    let position = StateFlags::POSITION;

    StateFlags::SIZE | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN | position
}

/// Enforce the minimum window size, but never a minimum the screen cannot show.
/// A minimum larger than the desktop is worse than no minimum at all: the window
/// then physically cannot be made to fit, so the user can neither see nor reach
/// its edges.
pub fn apply_min_size<R: Runtime>(window: &WebviewWindow<R>) {
    let (width, height) = min_size(work_area(window));
    if let Err(err) = window.set_min_size(Some(LogicalSize::new(width, height))) {
        tracing::warn!("[window] set_min_size({width}×{height}) failed: {err}");
    }
}

/// Shrink the window when it does not fit the monitor's work area, grow it when
/// it ended up below the (already clamped) minimum, and re-center whenever we had
/// to touch it.
///
/// Must run *after* `tauri-plugin-window-state` restored the persisted geometry,
/// which is what makes this the rescue line for restored-size drift: the plugin
/// re-applies the saved size as a raw `PhysicalSize` with no validation
/// whatsoever (only `POSITION` passes through a `Monitor::intersects` gate), and
/// `tao` converts it back to logical units using whatever `scale_factor` the
/// window happens to know at that moment — an `AtomicI32` filled from
/// `gtk_widget_get_scale_factor()` and only corrected later via
/// `connect_scale_factor_notify`. Restoring under a different (or not-yet-known)
/// scale than the save therefore halves or doubles the window, and without this
/// pass nothing would ever correct it again — the next close would just write the
/// broken geometry back to disk.
pub fn clamp_size<R: Runtime>(window: &WebviewWindow<R>) {
    // macOS is deliberately exempt, and not merely as a precaution.
    //
    // The drift this pass exists to correct is a tao/GTK problem: an integer
    // `scale_factor` that may still be wrong when `restore_state` runs, plus a
    // Wayland compositor that exposes no work-area protocol at all. macOS has
    // neither — `NSScreen.visibleFrame` is authoritative, the backing scale is
    // known before the window is shown, and AppKit already refuses to place a
    // window under the menu bar. There is nothing here left to repair.
    //
    // Meanwhile the cost on macOS is real: this window runs
    // `titleBarStyle: "Overlay"` with `hiddenTitle` and a hand-placed
    // `trafficLightPosition` (see `tauri.macos.conf.json`). That layout is
    // applied to the NSWindow at creation; resizing and re-centring it from the
    // setup hook is exactly the kind of late mutation that drops the traffic
    // lights back into a title bar of their own — leaving the app with two
    // stacked bars and square corners instead of one overlaid, rounded frame.
    //
    // So: keep the repair where the defect is, and do not touch a window that
    // was already correct.
    #[cfg(target_os = "macos")]
    let _ = window;

    #[cfg(not(target_os = "macos"))]
    {
        // A maximized or fullscreen window is sized by the compositor; resizing it
        // here would silently drop it out of that state.
        if window.is_maximized().unwrap_or(false) || window.is_fullscreen().unwrap_or(false) {
            return;
        }

        let Some(area) = work_area(window) else {
            return;
        };
        let Some(current) = logical_inner_size(window) else {
            return;
        };
        if !needs_clamp(area, current) {
            return;
        }

        let (width, height) = clamp_target(area, current);
        tracing::info!(
            "[window] geometry {:.0}×{:.0} does not fit work area {:.0}×{:.0} (logical) — \
         clamping to {width:.0}×{height:.0}",
            current.0,
            current.1,
            area.width,
            area.height
        );
        if let Err(err) = window.set_size(LogicalSize::new(width, height)) {
            tracing::warn!("[window] set_size({width}×{height}) failed: {err}");
            return;
        }
        if let Err(err) = window.center() {
            tracing::warn!("[window] center failed: {err}");
        }
    }
}

fn work_area<R: Runtime>(window: &WebviewWindow<R>) -> Option<WorkArea> {
    // `current_monitor()` is `None` whenever the platform cannot yet say which
    // output the surface belongs to — routinely the case on Wayland before the
    // surface is mapped and has seen its first `enter` event. Fall back to the
    // primary monitor, then to the hard-coded floors further down.
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    logical_work_area(&monitor)
}

fn logical_work_area(monitor: &Monitor) -> Option<WorkArea> {
    // `Monitor::work_area()` is physical pixels on every platform. On Linux it is
    // literally `gdk_monitor.workarea().to_physical(monitor.scale_factor())`, so
    // dividing by the *monitor's* scale factor (not the window's) round-trips
    // exactly instead of mixing two independently-updated values.
    let scale = monitor.scale_factor();
    if !scale.is_finite() || scale <= 0.0 {
        return None;
    }
    let size = monitor.work_area().size;
    let width = f64::from(size.width) / scale;
    let height = f64::from(size.height) / scale;
    if width < 1.0 || height < 1.0 {
        return None;
    }
    Some(WorkArea { width, height })
}

#[cfg_attr(target_os = "macos", allow(dead_code))]
fn logical_inner_size<R: Runtime>(window: &WebviewWindow<R>) -> Option<(f64, f64)> {
    let scale = window.scale_factor().ok()?;
    if !scale.is_finite() || scale <= 0.0 {
        return None;
    }
    let size = window.inner_size().ok()?;
    Some((
        f64::from(size.width) / scale,
        f64::from(size.height) / scale,
    ))
}

fn min_size(area: Option<WorkArea>) -> (f64, f64) {
    match area {
        Some(area) => {
            let (max_width, max_height) = area.ceiling();
            (MIN_WIDTH.min(max_width), MIN_HEIGHT.min(max_height))
        }
        None => (MIN_WIDTH, MIN_HEIGHT),
    }
}

/// Only intervene when the window genuinely cannot fit, so a user who sized the
/// window to nearly fill their screen keeps that size. The lower bound catches
/// the halved-scale restore, where the window ends up below its own minimum.
#[cfg_attr(target_os = "macos", allow(dead_code))]
fn needs_clamp(area: WorkArea, current: (f64, f64)) -> bool {
    let (min_width, min_height) = min_size(Some(area));
    current.0 > area.width + EPSILON
        || current.1 > area.height + EPSILON
        || current.0 < min_width - EPSILON
        || current.1 < min_height - EPSILON
}

/// Rescue geometry for a window `needs_clamp` rejected, decided per axis
/// *against the size the user actually had*.
///
/// Answering with the wished default regardless of `current` was the earlier
/// behaviour and it silently destroyed deliberate near-fullscreen setups:
/// `needs_clamp` fires as soon as one axis exceeds the work area by more than
/// `EPSILON`, so a two-pixel overshoot — a panel appearing, a second monitor
/// being plugged in — collapsed the window to 1280×800, and the next close
/// persisted that as the new saved geometry.
#[cfg_attr(target_os = "macos", allow(dead_code))]
fn clamp_target(area: WorkArea, current: (f64, f64)) -> (f64, f64) {
    let (max_width, max_height) = area.ceiling();
    let (min_width, min_height) = min_size(Some(area));
    (
        axis_target(current.0, DEFAULT_WIDTH, min_width, max_width),
        axis_target(current.1, DEFAULT_HEIGHT, min_height, max_height),
    )
}

/// Above the minimum, `current` is a user choice and only the ceiling may cut
/// it back. Below it, `current` cannot be a choice at all — GTK enforces the
/// minimum, so anything smaller is restore drift — and the wished default is a
/// friendlier landing spot than the bare floor.
#[cfg_attr(target_os = "macos", allow(dead_code))]
fn axis_target(current: f64, default: f64, min: f64, max: f64) -> f64 {
    // `min_size` already floors itself at the ceiling, so `min <= max` holds for
    // every work area `logical_work_area` accepts. `f64::clamp` *panics* when it
    // does not, so the invariant is re-established here instead of trusted: a
    // future prefix/fraction change must not be able to abort startup.
    let max = max.max(min);
    if current < min {
        default.clamp(min, max)
    } else {
        current.min(max)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn area(width: f64, height: f64) -> WorkArea {
        WorkArea { width, height }
    }

    #[test]
    fn min_size_never_exceeds_the_usable_desktop() {
        // 1920×1080 at GDK_SCALE=2 → 960×540 logical.
        let (width, height) = min_size(Some(area(960.0, 540.0)));
        assert!(width <= 960.0 * WORK_AREA_FRACTION);
        assert!(height <= 540.0 * WORK_AREA_FRACTION);
    }

    #[test]
    fn min_size_keeps_the_desktop_floor_on_roomy_monitors() {
        assert_eq!(
            min_size(Some(area(2560.0, 1440.0))),
            (MIN_WIDTH, MIN_HEIGHT)
        );
    }

    #[test]
    fn min_size_falls_back_to_constants_without_monitor_info() {
        assert_eq!(min_size(None), (MIN_WIDTH, MIN_HEIGHT));
    }

    #[test]
    fn a_window_that_fits_is_left_alone() {
        assert!(!needs_clamp(area(2560.0, 1440.0), (1280.0, 800.0)));
        // Nearly filling the screen is a legitimate user choice.
        assert!(!needs_clamp(area(1920.0, 1080.0), (1900.0, 1070.0)));
    }

    #[test]
    fn oversized_and_undersized_geometry_is_clamped() {
        // Doubled by a 1×→2× restore drift.
        assert!(needs_clamp(area(1920.0, 1080.0), (2560.0, 1600.0)));
        // Halved by a 2×→1× restore drift, below the clamped minimum.
        assert!(needs_clamp(area(960.0, 540.0), (640.0, 400.0)));
    }

    #[test]
    fn clamp_target_stays_inside_the_work_area() {
        let small = area(960.0, 540.0);
        let (width, height) = clamp_target(small, (1280.0, 800.0));
        assert!(width <= small.width && height <= small.height);

        // Roomy monitors keep the wished default, not a shrunken window.
        assert_eq!(
            clamp_target(area(2560.0, 1440.0), (DEFAULT_WIDTH, DEFAULT_HEIGHT)),
            (DEFAULT_WIDTH, DEFAULT_HEIGHT)
        );
    }

    #[test]
    fn a_small_overshoot_keeps_a_near_fullscreen_window_large() {
        // 11 px too tall — a panel appeared, or the window moved to a monitor
        // with slightly less usable height. The old `clamp_target` ignored
        // `current` and answered the default, so this collapsed the window to
        // 1280×800 *and* persisted it on the next close.
        let work = area(1920.0, 1000.0);
        let restored = (1920.0, 1011.0);
        assert!(needs_clamp(work, restored));

        let target = clamp_target(work, restored);
        assert_ne!(target, (DEFAULT_WIDTH, DEFAULT_HEIGHT));
        // The largest size this module is willing to grant on that monitor —
        // the 10 % slack is `WORK_AREA_FRACTION`, not a fallback to the default.
        assert_eq!(target, work.ceiling());
        assert!(target.0 > DEFAULT_WIDTH && target.1 > DEFAULT_HEIGHT);
    }

    #[test]
    fn a_restore_below_the_minimum_grows_back_to_the_wished_default() {
        // Halved by a 2×→1× scale drift. GTK enforces the minimum, so a window
        // this small is drift and never a user choice — the default is the
        // right landing spot, the bare floor would be a needless downgrade.
        assert_eq!(
            clamp_target(area(2560.0, 1440.0), (640.0, 400.0)),
            (DEFAULT_WIDTH, DEFAULT_HEIGHT)
        );
    }

    #[test]
    fn axis_target_survives_a_minimum_above_the_ceiling() {
        // `min_size` cannot produce this today, but `f64::clamp` panics on
        // `min > max`, and a panic here aborts the `setup` hook. Assert the
        // guard rather than trusting the caller to keep the invariant.
        assert_eq!(axis_target(400.0, DEFAULT_WIDTH, 1100.0, 300.0), 1100.0);
        assert_eq!(axis_target(2000.0, DEFAULT_WIDTH, 1100.0, 300.0), 1100.0);
    }

    #[test]
    fn a_degenerate_work_area_does_not_panic() {
        let tiny = area(200.0, 120.0);
        assert_eq!(clamp_target(tiny, (2560.0, 1600.0)), tiny.ceiling());
        assert_eq!(clamp_target(tiny, (100.0, 60.0)), tiny.ceiling());
    }
}
