use crate::discovery::{list_all, AppKind, DiscoveredApp};

#[tauri::command]
pub fn list_terminals() -> Vec<DiscoveredApp> {
    list_all()
        .into_iter()
        .filter(|a| matches!(a.kind, AppKind::Terminal))
        .collect()
}

#[tauri::command]
pub fn list_ides() -> Vec<DiscoveredApp> {
    list_all()
        .into_iter()
        .filter(|a| matches!(a.kind, AppKind::Ide))
        .collect()
}
