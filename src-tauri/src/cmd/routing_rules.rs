use super::{CmdResult, StringifyErr as _};

#[tauri::command]
#[specta::specta]
pub async fn get_builtin_routing_rules(service: std::string::String) -> CmdResult<Vec<std::string::String>> {
    crate::config::default_service_rules(&service).stringify_err()
}
