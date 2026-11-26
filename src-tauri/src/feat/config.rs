use crate::config::{Config, IVerge};
use anyhow::Result;
use clash_verge_draft::SharedDraft;
use serde_yaml_ng::Mapping;
use tokio::sync::MutexGuard;

pub async fn patch_clash(patch: &Mapping) -> Result<()> {
    anyhow::ensure!(
        patch
            .get("tun")
            .and_then(|tun| tun.get("enable"))
            .and_then(serde_yaml_ng::Value::as_bool)
            != Some(true),
        "Claude Verge currently supports sidecar mode only; TUN is unavailable"
    );
    let config_write = Config::try_lock_config_write()?;
    let verge = Config::verge().await.latest_arc();
    if (verge.claude_routing.as_ref().is_some_and(|r| r.enabled)
        || verge.codex_routing.as_ref().is_some_and(|r| r.enabled))
        && let Some(mode) = patch.get("mode")
    {
        ensure_rule_mode(mode.as_str())?;
    }
    super::executor::apply(
        &config_write,
        super::executor::Patch::Clash(patch),
        super::effects::clash_effects(patch),
    )
    .await
}

/// Apply a patch, then reconcile TUN when its setting changes.
///
/// TUN patches do not always produce a Run State transition, so reconciliation is explicit.
pub async fn patch_verge(patch: &IVerge, not_save_file: bool) -> Result<()> {
    apply_verge_patch(patch, not_save_file).await?;
    if patch.enable_tun_mode.is_some() {
        super::reconcile_tun_availability().await;
    }
    Ok(())
}

/// Apply a patch without post-update reconciliation.
pub(super) async fn apply_verge_patch(patch: &IVerge, not_save_file: bool) -> Result<()> {
    let config_write = Config::lock_config_write().await;
    apply_verge_patch_locked(&config_write, patch, not_save_file).await
}

/// Apply a patch with the shared configuration write lock already held.
/// Callers must pass the guard returned by [`Config::lock_config_write`].
pub(super) async fn apply_verge_patch_locked(
    _config_write: &MutexGuard<'_, ()>,
    patch: &IVerge,
    not_save_file: bool,
) -> Result<()> {
    anyhow::ensure!(
        patch.enable_tun_mode != Some(true),
        "Claude Verge currently supports sidecar mode only; TUN is unavailable"
    );
    anyhow::ensure!(
        patch.enable_proxy_guard != Some(true),
        "Proxy guard is unavailable in the coexistence build"
    );
    for routing in [&patch.claude_routing, &patch.codex_routing].into_iter().flatten() {
        routing.validate()?;
        if routing.enabled {
            let clash = Config::clash().await;
            let mode = clash.latest_arc().get_mode();
            ensure_rule_mode(mode.as_deref())?;
        }
    }
    super::executor::apply(
        _config_write,
        super::executor::Patch::Verge {
            patch,
            persist: !not_save_file,
        },
        super::effects::verge_effects(patch),
    )
    .await
}

pub(super) fn ensure_rule_mode(mode: Option<&str>) -> Result<()> {
    anyhow::ensure!(
        mode.is_some_and(|mode| mode.eq_ignore_ascii_case("rule")),
        "专用分流启用时必须使用规则模式"
    );
    Ok(())
}

#[cfg(test)]
mod mode_guard_tests {
    #[test]
    fn dedicated_routing_requires_rule_mode() {
        assert!(super::ensure_rule_mode(Some("rule")).is_ok());
        assert!(super::ensure_rule_mode(Some("Rule")).is_ok());
        assert!(super::ensure_rule_mode(Some("global")).is_err());
        assert!(super::ensure_rule_mode(Some("direct")).is_err());
        assert!(super::ensure_rule_mode(None).is_err());
    }
}

pub async fn fetch_verge_config() -> Result<SharedDraft<IVerge>> {
    let draft = Config::verge().await;
    let data = draft.data_arc();
    Ok(data)
}
