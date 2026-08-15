#!/bin/sh
# Recrest launcher wrapper.
#
# Plan 1 §C.5: pick the right GDK backend at runtime so the bundled binary
# works on both Wayland and X11 sessions without re-building. We default to
# Wayland when the compositor exposes WAYLAND_DISPLAY, falling back to X11
# otherwise.
#
# The reason is native rendering, NOT fractional scaling: this stack is GTK 3
# (gtk/gdk 0.18.2), which does not implement `wp_fractional_scale_v1` — that is
# GTK 4 only — and tao stores the scale factor as an AtomicI32, so there is no
# representation for a fractional value either way. What Wayland buys us is
# avoiding XWayland: no extra translation layer, no blurry upscaled surface on a
# HiDPI output. X11 keeps things working on legacy desktops.

if [ -n "$WAYLAND_DISPLAY" ]; then
    export GDK_BACKEND=wayland
else
    export GDK_BACKEND=x11
fi

# The executable's file name is NOT the same on every channel, so probe instead
# of hardcoding one. Cargo emits `Recrest` (capital R — see the `[[bin]]`
# comment in Cargo.toml, the name drives the macOS Dock label) and that is what
# the .deb / .rpm / .AppImage bundles install as `usr/bin/Recrest`, while the
# AUR package deliberately installs it lowercase as `/usr/bin/recrest`. v0.11.0
# shipped a launcher that only knew the lowercase path, which on any
# case-sensitive filesystem is a dead menu entry.
#
# `$APPDIR` (exported by every AppImage runtime) and this script's own directory
# are probed first so an AppImage resolves the binary inside its own mount
# rather than picking up an unrelated system-wide install. AppImage's AppRun
# execs us through PATH, so `$0` can be a bare name — hence the explicit
# `$APPDIR` entries rather than relying on the dirname alone.
self_dir=$(dirname -- "$0")
case "$self_dir" in
    /*) ;;
    *) self_dir=$(cd -- "$self_dir" 2>/dev/null && pwd) ;;
esac

for candidate in \
    "${APPDIR:+$APPDIR/usr/bin/Recrest}" \
    "${APPDIR:+$APPDIR/usr/bin/recrest}" \
    "${self_dir:+$self_dir/Recrest}" \
    "${self_dir:+$self_dir/recrest}" \
    /usr/bin/Recrest \
    /usr/bin/recrest \
    /usr/local/bin/Recrest \
    /usr/local/bin/recrest
do
    [ -n "$candidate" ] || continue
    if [ -f "$candidate" ] && [ -x "$candidate" ]; then
        # `exec` replaces this shell, so signal forwarding (SIGTERM on logout,
        # SIGINT from a terminal) needs no trap plumbing here.
        exec "$candidate" "$@"
    fi
done

echo "recrest-launcher: no Recrest executable found (searched \$APPDIR/usr/bin, $self_dir, /usr/bin, /usr/local/bin)" >&2
exit 127
