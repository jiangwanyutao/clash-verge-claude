use super::{CmdResult, StringifyErr as _};
use crate::{config::Config, core::CoreManager, utils::dirs};
use anyhow::{Context as _, Result, bail, ensure};
use serde_yaml_ng::{Mapping, Value};
use std::collections::HashSet;

#[derive(Clone, serde::Serialize, specta::Type)]
pub struct SubscriptionExitNode {
    pub name: std::string::String,
    pub source: std::string::String,
}

#[derive(serde::Serialize, specta::Type)]
pub struct SubscriptionExitList {
    pub profile_uid: std::string::String,
    pub nodes: Vec<SubscriptionExitNode>,
    pub excluded_override_providers: usize,
}

fn check_profile(committed: Option<&str>, draft: Option<&str>, expected: Option<&str>) -> Result<std::string::String> {
    let current = committed.context("No active subscription")?;
    ensure!(
        draft == Some(current),
        "Subscription is changing; refresh the node list"
    );
    ensure!(
        expected.is_none_or(|uid| uid == current),
        "Subscription changed; refresh the node list"
    );
    Ok(current.to_owned())
}

async fn current_profile(expected: Option<&str>) -> Result<std::string::String> {
    let profiles = Config::profiles().await;
    let committed = profiles.data_arc();
    let draft = profiles.latest_arc();
    check_profile(committed.current.as_deref(), draft.current.as_deref(), expected)
}

fn nodes(config: &Mapping, root: &std::path::Path) -> (Vec<(SubscriptionExitNode, Mapping)>, usize) {
    let mut result = Vec::new();
    let mut excluded = 0;
    let mut add = |source: &str, entries: Option<&Vec<Value>>| {
        for node in entries.into_iter().flatten().filter_map(Value::as_mapping) {
            let Some(name) = node.get("name").and_then(Value::as_str) else {
                continue;
            };
            if name.is_empty() || name.starts_with("Claude-Verge:") || name.starts_with("Codex-Verge:") {
                continue;
            }
            result.push((
                SubscriptionExitNode {
                    name: name.to_owned(),
                    source: source.to_owned(),
                },
                node.clone(),
            ));
        }
    };
    add("profile", config.get("proxies").and_then(Value::as_sequence));
    if let Some(providers) = config.get("proxy-providers").and_then(Value::as_mapping) {
        for (key, provider) in providers {
            let (Some(name), Some(provider)) = (key.as_str(), provider.as_mapping()) else {
                continue;
            };
            if name.starts_with("Claude-Verge:") || name.starts_with("Codex-Verge:") {
                continue;
            }
            if provider.contains_key("override") {
                excluded += 1;
                continue;
            }
            let Some(path) = provider.get("path").and_then(Value::as_str) else {
                continue;
            };
            let Ok(root) = root.canonicalize() else { continue };
            let Ok(file) = root.join(path).canonicalize() else {
                continue;
            };
            if !file.starts_with(&root)
                || !file.is_file()
                || file.metadata().map_or(true, |m| m.len() > 4 * 1024 * 1024)
            {
                continue;
            }
            let Ok(content) = std::fs::read_to_string(file) else {
                continue;
            };
            let Ok(Value::Mapping(document)) = serde_yaml_ng::from_str::<Value>(&content) else {
                continue;
            };
            add(
                &format!("provider:{name}"),
                document.get("proxies").and_then(Value::as_sequence),
            );
        }
    }
    (result, excluded)
}

async fn runtime_nodes() -> Result<(Vec<(SubscriptionExitNode, Mapping)>, usize)> {
    let runtime = Config::runtime().await;
    let latest = runtime.latest_arc();
    let config = latest.config.as_ref().context("Current subscription is unavailable")?;
    Ok(nodes(config, &dirs::app_home_dir()?))
}

#[tauri::command]
#[specta::specta]
pub async fn list_subscription_exit_nodes() -> CmdResult<SubscriptionExitList> {
    let lock = Config::try_lock_config_write().stringify_err()?;
    let manager = CoreManager::global();
    let update = manager.claim_config_update(&lock).stringify_err()?;
    let profile_uid = current_profile(None).await.stringify_err()?;
    let (entries, excluded_override_providers) = runtime_nodes().await.stringify_err()?;
    current_profile(Some(&profile_uid)).await.stringify_err()?;
    drop(update);
    drop(lock);
    Ok(SubscriptionExitList {
        profile_uid,
        nodes: entries.into_iter().map(|(node, _)| node).collect(),
        excluded_override_providers,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn snapshot_subscription_exit(
    name: std::string::String,
    source: std::string::String,
    profile_uid: std::string::String,
) -> CmdResult<std::string::String> {
    let lock = Config::try_lock_config_write().stringify_err()?;
    let manager = CoreManager::global();
    let update = manager.claim_config_update(&lock).stringify_err()?;
    current_profile(Some(&profile_uid)).await.stringify_err()?;
    let result = snapshot(&runtime_nodes().await.stringify_err()?.0, &name, &source).stringify_err()?;
    current_profile(Some(&profile_uid)).await.stringify_err()?;
    drop(update);
    drop(lock);
    Ok(result)
}

fn snapshot(all: &[(SubscriptionExitNode, Mapping)], name: &str, source: &str) -> Result<std::string::String> {
    let mut result = Vec::new();
    let mut seen = HashSet::new();
    let mut current = name;
    loop {
        ensure!(seen.insert(current.to_owned()), "Proxy dependency cycle");
        let matches: Vec<_> = all
            .iter()
            .filter(|(node, _)| node.name == current && node.source == source)
            .collect();
        ensure!(
            matches.len() == 1,
            "Node missing or ambiguous; refresh the subscription list"
        );
        let node = &matches[0].1;
        let kind = node.get("type").and_then(Value::as_str).unwrap_or_default();
        ensure!(
            matches!(
                kind,
                "http"
                    | "socks5"
                    | "ss"
                    | "ssr"
                    | "vmess"
                    | "vless"
                    | "trojan"
                    | "hysteria"
                    | "hysteria2"
                    | "tuic"
                    | "wireguard"
                    | "ssh"
                    | "snell"
                    | "mieru"
            ),
            "Unsupported node type"
        );
        result.push(Value::Mapping(node.clone()));
        match node.get("dialer-proxy").and_then(Value::as_str) {
            Some("DIRECT") => bail!("Direct proxy dependencies are not allowed"),
            Some(next) => current = next,
            None => break,
        }
    }
    let mut out = Mapping::new();
    out.insert("proxies".into(), Value::Sequence(result));
    serde_yaml_ng::to_string(&out).context("Cannot serialize node snapshot")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_changed_or_pending_profiles() {
        assert!(check_profile(Some("one"), Some("one"), Some("one")).is_ok());
        assert!(check_profile(Some("two"), Some("two"), Some("one")).is_err());
        assert!(check_profile(Some("one"), Some("two"), Some("one")).is_err());
        assert!(check_profile(None, None, None).is_err());
    }

    #[test]
    fn snapshots_only_unique_nodes_and_fails_closed() {
        let config: Mapping =
            serde_yaml_ng::from_str("proxies:\n  - {name: Node, type: http, server: test.example, port: 8080}\n")
                .unwrap();
        let all = nodes(&config, std::path::Path::new(".")).0;
        assert_eq!(all.len(), 1);
        assert!(snapshot(&all, "Node", "profile").unwrap().contains("test.example"));
        assert!(snapshot(&all, "Node", "provider:other").is_err());
        let mut duplicate = all.clone();
        duplicate.extend(all);
        assert!(snapshot(&duplicate, "Node", "profile").is_err());
    }

    #[test]
    fn rejects_direct_and_missing_dependencies() {
        let config: Mapping = serde_yaml_ng::from_str(
            "proxies:\n  - {name: Unsafe, type: http, server: test.example, port: 8080, dialer-proxy: DIRECT}\n  - {name: Missing, type: http, server: test.example, port: 8080, dialer-proxy: Absent}\n",
        ).unwrap();
        let all = nodes(&config, std::path::Path::new(".")).0;
        assert!(snapshot(&all, "Unsafe", "profile").is_err());
        assert!(snapshot(&all, "Missing", "profile").is_err());
    }

    #[test]
    fn refuses_cycles_and_provider_overrides_and_outside_paths() {
        let root = std::env::temp_dir().join(format!("claude-route-provider-test-{}", std::process::id()));
        let inner = root.join("home");
        std::fs::create_dir_all(&inner).unwrap();
        let data = "proxies:\n  - {name: Cached, type: http, server: test.example, port: 8080}\n";
        std::fs::write(inner.join("nodes.yaml"), data).unwrap();
        std::fs::write(root.join("outside.yaml"), data).unwrap();
        let config: Mapping = serde_yaml_ng::from_str("proxy-providers:\n  safe: {path: nodes.yaml}\n  outside: {path: ../outside.yaml}\n  overridden: {path: nodes.yaml, override: {prefix: secret}}\n").unwrap();
        let (entries, excluded) = nodes(&config, &inner);
        assert_eq!(excluded, 1);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].0.source, "provider:safe");
        assert!(snapshot(&entries, "Cached", "provider:safe").is_ok());
        let cyclic: Mapping = serde_yaml_ng::from_str(
            "proxies:\n  - {name: A, type: http, dialer-proxy: B}\n  - {name: B, type: http, dialer-proxy: A}\n",
        )
        .unwrap();
        assert!(snapshot(&nodes(&cyclic, &inner).0, "A", "profile").is_err());
        std::fs::remove_file(inner.join("nodes.yaml")).unwrap();
        std::fs::remove_file(root.join("outside.yaml")).unwrap();
        std::fs::remove_dir(inner).unwrap();
        std::fs::remove_dir(root).unwrap();
    }
}
