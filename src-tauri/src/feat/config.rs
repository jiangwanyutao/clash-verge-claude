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
    if let Some(routing) = &patch.claude_routing {
        routing.validate()?;
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

pub async fn fetch_verge_config() -> Result<SharedDraft<IVerge>> {
    let draft = Config::verge().await;
    let data = draft.data_arc();
    Ok(data)
}
