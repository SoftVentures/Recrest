//! User-uploaded custom fonts.
//!
//! Fonts are copied into `<app_data>/fonts/<family>.<ext>` and surfaced to the
//! renderer with their bytes Base64-encoded inline, so the frontend can
//! register an `@font-face`/`FontFace` at runtime without a second round trip
//! or asset-protocol scope. Fonts are tiny (a handful, capped at a few MB), so
//! inlining the bytes in the listing is cheaper than a per-font read command.
//!
//! The on-disk file name IS the source of truth — `family` is re-derived from
//! the file stem on every `list`, so there is no separate manifest to keep in
//! sync.

use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::error::CommandError;

/// Accepted upload extensions. WOFF/WOFF2 and the raw TTF/OTF outlines all
/// load through the browser Font Loading API from an `ArrayBuffer`.
const ALLOWED_FONT_EXTENSIONS: &[&str] = &["ttf", "otf", "woff2", "woff"];

/// Hard cap on a single uploaded font. Real faces sit well under this; the
/// cap just stops a pathological file from bloating settings round trips.
const MAX_FONT_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFont {
    pub id: String,
    pub family: String,
    pub file_name: String,
    pub format: String,
    /// Base64-encoded font bytes for runtime `FontFace` registration.
    pub data: String,
}

fn fonts_dir(app: &AppHandle) -> Result<PathBuf, CommandError> {
    if let Some(root) = crate::identity::test_profile_root() {
        return Ok(root.join("fonts"));
    }
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::internal(format!("app data dir unavailable: {e}")))?;
    Ok(base.join("fonts"))
}

/// CSS `@font-face` `format()` hint for a file extension.
fn format_for_ext(ext: &str) -> &'static str {
    match ext {
        "otf" => "opentype",
        "woff2" => "woff2",
        "woff" => "woff",
        _ => "truetype",
    }
}

/// Derive a safe font family / file name from an uploaded file's stem. Keeps
/// letters, digits, spaces, hyphens and underscores; collapses whitespace
/// runs; trims; caps length. The result contains no path separators, `.`, or
/// `..`, so it is safe to interpolate into a file name.
fn sanitize_family(raw: &str) -> String {
    let mut out = String::new();
    let mut pending_space = false;
    for ch in raw.chars() {
        if ch.is_alphanumeric() || ch == '-' || ch == '_' {
            if pending_space && !out.is_empty() {
                out.push(' ');
            }
            pending_space = false;
            out.push(ch);
        } else if ch.is_whitespace() {
            pending_space = true;
        }
        // Everything else (slashes, dots, colons, quotes…) is dropped.
    }
    out.trim().chars().take(64).collect()
}

/// Build a `CustomFont` from a stored font file, reading + encoding its bytes.
/// Returns `None` for files that aren't fonts or have an unusable name.
fn read_font(path: &Path) -> Option<CustomFont> {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())?;
    if !ALLOWED_FONT_EXTENSIONS.iter().any(|e| *e == ext) {
        return None;
    }
    let family = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(sanitize_family)?;
    if family.is_empty() {
        return None;
    }
    let bytes = std::fs::read(path).ok()?;
    Some(CustomFont {
        id: family.clone(),
        file_name: path.file_name()?.to_string_lossy().to_string(),
        format: format_for_ext(&ext).to_string(),
        data: B64.encode(&bytes),
        family,
    })
}

/// List every uploaded font under `<app_data>/fonts/`, bytes inlined.
#[tauri::command]
pub async fn list_custom_fonts(app: AppHandle) -> Result<Vec<CustomFont>, CommandError> {
    let dir = fonts_dir(&app)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let entries = std::fs::read_dir(&dir)
        .map_err(|e| CommandError::internal(format!("read fonts dir failed: {e}")))?;
    let mut fonts: Vec<CustomFont> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_file())
        .filter_map(|p| read_font(&p))
        .collect();
    fonts.sort_by(|a, b| a.family.to_lowercase().cmp(&b.family.to_lowercase()));
    Ok(fonts)
}

/// Copy a user-picked font file into the managed fonts dir and return it. The
/// `source_path` comes from the native file picker (the user explicitly chose
/// it), mirroring `set_repo_logo`'s upload flow.
#[tauri::command]
pub async fn upload_font(
    app: AppHandle,
    source_path: String,
) -> Result<CustomFont, CommandError> {
    let source = PathBuf::from(&source_path);
    let source_canon = std::fs::canonicalize(&source)
        .map_err(|e| CommandError::not_found(format!("font file not found: {e}")))?;
    let ext = source_canon
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .ok_or_else(|| CommandError::bad_request("font file has no extension"))?;
    if !ALLOWED_FONT_EXTENSIONS.iter().any(|e| *e == ext) {
        return Err(CommandError::bad_request(format!(
            "unsupported font format `.{ext}` — use one of {}",
            ALLOWED_FONT_EXTENSIONS.join(", ")
        )));
    }
    let meta = std::fs::metadata(&source_canon)
        .map_err(|e| CommandError::not_found(format!("font stat failed: {e}")))?;
    if !meta.is_file() {
        return Err(CommandError::bad_request("source is not a file"));
    }
    if meta.len() == 0 {
        return Err(CommandError::bad_request("font file is empty"));
    }
    if meta.len() > MAX_FONT_BYTES {
        return Err(CommandError::bad_request(format!(
            "font too large ({} bytes, max {})",
            meta.len(),
            MAX_FONT_BYTES
        )));
    }
    let family = source_canon
        .file_stem()
        .and_then(|s| s.to_str())
        .map(sanitize_family)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| CommandError::bad_request("could not derive a font name from the file"))?;

    let dir = fonts_dir(&app)?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| CommandError::internal(format!("create fonts dir failed: {e}")))?;

    // Replace any prior upload sharing this family (any extension) so
    // re-uploading the same font doesn't leave a stale file behind.
    for stale_ext in ALLOWED_FONT_EXTENSIONS {
        let stale = dir.join(format!("{family}.{stale_ext}"));
        if stale.exists() {
            let _ = std::fs::remove_file(&stale);
        }
    }

    let dest = dir.join(format!("{family}.{ext}"));
    std::fs::copy(&source_canon, &dest)
        .map_err(|e| CommandError::internal(format!("copy font failed: {e}")))?;

    read_font(&dest).ok_or_else(|| CommandError::internal("stored font could not be read back"))
}

/// Delete an uploaded font by id (its sanitized family name).
#[tauri::command]
pub async fn delete_custom_font(app: AppHandle, id: String) -> Result<(), CommandError> {
    let family = sanitize_family(&id);
    if family.is_empty() {
        return Err(CommandError::bad_request("invalid font id"));
    }
    let dir = fonts_dir(&app)?;
    let mut removed = false;
    for ext in ALLOWED_FONT_EXTENSIONS {
        let path = dir.join(format!("{family}.{ext}"));
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| CommandError::internal(format!("delete font failed: {e}")))?;
            removed = true;
        }
    }
    if !removed {
        return Err(CommandError::not_found(format!("font `{family}` not found")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_strips_path_hostile_chars() {
        assert_eq!(sanitize_family("My Cool Font"), "My Cool Font");
        assert_eq!(sanitize_family("../../etc/passwd"), "etcpasswd");
        assert_eq!(sanitize_family("a/b\\c:d"), "abcd");
        assert_eq!(sanitize_family("  spaced   out  "), "spaced out");
        assert_eq!(sanitize_family("v1.2"), "v12");
        assert!(sanitize_family("///").is_empty());
    }

    #[test]
    fn format_hint_maps_extensions() {
        assert_eq!(format_for_ext("ttf"), "truetype");
        assert_eq!(format_for_ext("otf"), "opentype");
        assert_eq!(format_for_ext("woff2"), "woff2");
        assert_eq!(format_for_ext("woff"), "woff");
    }
}
