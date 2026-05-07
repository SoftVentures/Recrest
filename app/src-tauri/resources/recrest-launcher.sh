#!/bin/sh
# Recrest launcher wrapper.
#
# Plan 1 §C.5: pick the right GDK backend at runtime so the bundled binary
# works on both Wayland and X11 sessions without re-building. We default to
# Wayland when the compositor exposes WAYLAND_DISPLAY, falling back to X11
# otherwise — Wayland gives us native fractional scaling via
# `wp_fractional_scale_v1`, X11 keeps things working on legacy desktops.

if [ -n "$WAYLAND_DISPLAY" ]; then
    export GDK_BACKEND=wayland
else
    export GDK_BACKEND=x11
fi

# M5: the bundle installs the Tauri-built executable under its native
# `recrest` name, NOT `recrest-bin`. This launcher is what the .desktop
# entry invokes, so it forwards to the real binary via absolute path. The
# wrapper exists purely to set GDK_BACKEND above; signal forwarding
# (SIGTERM on logout, SIGINT from the terminal) flows through `exec`'s
# process replacement.
exec /usr/bin/recrest "$@"
