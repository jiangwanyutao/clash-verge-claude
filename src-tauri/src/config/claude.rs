use anyhow::{Result, bail, ensure};
use serde::{Deserialize, Serialize};
use serde_yaml_ng::{Mapping, Value};
use std::{collections::HashSet, fmt};

const GROUP: &str = "Claude-Verge";
const PREFIX: &str = "Claude-Verge:";

#[derive(Default, Clone, Deserialize, Serialize, specta::Type)]
#[serde(default, deny_unknown_fields)]
pub struct ClaudeRouting {
    pub enabled: bool,
    pub selected_exit: String,
    pub configuration: String,
    pub exit_names: Vec<String>,
    pub rules: Option<Vec<String>>,
}

impl fmt::Debug for ClaudeRouting {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ClaudeRouting")
            .field("enabled", &self.enabled)
            .field("configuration", &"[redacted]")
            .finish_non_exhaustive()
    }
}

#[derive(Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Endpoints {
    proxies: Vec<Mapping>,
    #[serde(rename = "proxy-groups")]
    groups: Vec<Mapping>,
    #[serde(rename = "proxy-providers")]
    providers: Mapping,
}

fn name(item: &Mapping) -> Result<&str> {
    let name = item.get("name").and_then(Value::as_str).unwrap_or_default();
    ensure!(
        !name.trim().is_empty() && name.len() <= 120,
        "Claude endpoint names must contain 1–120 bytes"
    );
    ensure!(
        !matches!(name, "DIRECT" | "REJECT" | "GLOBAL" | GROUP | "Codex-Verge")
            && !name.starts_with(PREFIX)
            && !name.starts_with("Codex-Verge:"),
        "Reserved Claude endpoint name"
    );
    Ok(name)
}

fn builtin(name: &str) -> bool {
    matches!(name, "DIRECT" | "REJECT")
}

fn outbound(name: &str, prefix: &str) -> String {
    if builtin(name) {
        name.to_owned()
    } else {
        format!("{prefix}{name}")
    }
}

fn strings<'a>(item: &'a Mapping, key: &str) -> Result<Vec<&'a str>> {
    match item.get(key) {
        None => Ok(Vec::new()),
        Some(Value::Sequence(items)) => items
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("Claude endpoint references must be strings"))
            })
            .collect(),
        Some(_) => bail!("Claude endpoint references must be lists"),
    }
}

fn check_reference(item: &Mapping, key: &str, names: &HashSet<&str>) -> Result<()> {
    if let Some(value) = item.get(key) {
        let reference = value
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Claude endpoint reference must be a string"))?;
        ensure!(
            builtin(reference) || names.contains(reference),
            "Claude endpoint references an undefined outbound"
        );
    }
    Ok(())
}

fn rewrite_reference(item: &mut Mapping, key: &str, prefix: &str) {
    if let Some(reference) = item.get(key).and_then(Value::as_str) {
        item.insert(key.into(), outbound(reference, prefix).into());
    }
}

fn rewrite_list(item: &mut Mapping, key: &str, prefix: &str) -> Result<()> {
    if item.contains_key(key) {
        let values = strings(item, key)?
            .into_iter()
            .map(|v| Value::String(outbound(v, prefix)))
            .collect();
        item.insert(key.into(), Value::Sequence(values));
    }
    Ok(())
}

fn validate_protected_outbound(name: &str, endpoints: &Endpoints, visited: &mut HashSet<String>) -> Result<()> {
    ensure!(name != "DIRECT", "Protected traffic cannot use DIRECT");
    if name == "REJECT" {
        return Ok(());
    }
    ensure!(visited.insert(name.to_owned()), "Protected outbound contains a cycle");
    if let Some(node) = endpoints
        .proxies
        .iter()
        .find(|node| node.get("name").and_then(Value::as_str) == Some(name))
    {
        ensure!(
            matches!(
                node.get("type").and_then(Value::as_str),
                Some(
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
                )
            ),
            "Protected traffic requires a supported static proxy node"
        );
        if let Some(dialer) = node.get("dialer-proxy").and_then(Value::as_str) {
            validate_protected_outbound(dialer, endpoints, visited)?;
        }
    } else if let Some(group) = endpoints
        .groups
        .iter()
        .find(|group| group.get("name").and_then(Value::as_str) == Some(name))
    {
        ensure!(
            group.get("type").and_then(Value::as_str) == Some("select"),
            "Protected exits cannot automatically switch nodes"
        );
        ensure!(
            strings(group, "use")?.is_empty(),
            "Protected exits require a specific static node; dynamic providers are not supported yet"
        );
        let members = strings(group, "proxies")?;
        ensure!(members.len() == 1, "Protected exits require exactly one static node");
        validate_protected_outbound(members[0], endpoints, visited)?;
    } else {
        bail!("Protected exit is not a defined static node");
    }
    visited.remove(name);
    Ok(())
}

impl ClaudeRouting {
    fn endpoints(&self) -> Result<Endpoints> {
        // Parser diagnostics can include a credential-bearing line from the YAML input.
        serde_yaml_ng::from_str(&self.configuration).map_err(|_| {
            anyhow::anyhow!("Invalid Claude YAML: only proxies, proxy-providers and proxy-groups are accepted")
        })
    }

    pub fn validate(&self) -> Result<()> {
        if let Some(rules) = &self.rules {
            custom_rules(rules, GROUP)?;
        }
        if self.configuration.trim().is_empty() && !self.enabled {
            return Ok(());
        }
        ensure!(
            self.configuration.len() <= 1_048_576,
            "Claude configuration exceeds 1 MiB"
        );
        let endpoints = self.endpoints()?;
        let mut names = HashSet::new();
        for item in endpoints.proxies.iter().chain(&endpoints.groups) {
            ensure!(names.insert(name(item)?), "Duplicate Claude endpoint name");
        }
        let mut providers = HashSet::new();
        for (key, value) in &endpoints.providers {
            let provider_name = key.as_str().unwrap_or_default();
            ensure!(
                !provider_name.trim().is_empty()
                    && provider_name.len() <= 120
                    && !builtin(provider_name)
                    && !provider_name.starts_with(PREFIX)
                    && !provider_name.starts_with("Codex-Verge:"),
                "Invalid Claude provider name"
            );
            providers.insert(provider_name);
            let provider = value
                .as_mapping()
                .ok_or_else(|| anyhow::anyhow!("Claude providers must be mappings"))?;
            ensure!(
                provider.get("type").and_then(Value::as_str) == Some("http"),
                "Claude providers must use HTTPS subscriptions"
            );
            ensure!(
                !provider.contains_key("payload"),
                "Claude providers cannot contain inline payloads"
            );
            let url = provider.get("url").and_then(Value::as_str).unwrap_or_default();
            let url = reqwest::Url::parse(url).map_err(|_| anyhow::anyhow!("Invalid Claude subscription URL"))?;
            ensure!(
                url.scheme() == "https" && url.host_str().is_some(),
                "Claude subscriptions require HTTPS"
            );
            check_reference(provider, "proxy", &names)?;
            if let Some(overrides) = provider.get("override") {
                let overrides = overrides
                    .as_mapping()
                    .ok_or_else(|| anyhow::anyhow!("Claude provider override must be a mapping"))?;
                check_reference(overrides, "dialer-proxy", &names)?;
            }
        }
        for node in &endpoints.proxies {
            ensure!(
                node.get("type").and_then(Value::as_str).is_some(),
                "Claude nodes require a type"
            );
            check_reference(node, "dialer-proxy", &names)?;
        }
        for group in &endpoints.groups {
            ensure!(
                matches!(
                    group.get("type").and_then(Value::as_str),
                    Some("select" | "url-test" | "fallback" | "load-balance")
                ),
                "Unsupported Claude group type"
            );
            for key in ["include-all", "include-all-proxies", "include-all-providers"] {
                ensure!(
                    !group.get(key).and_then(Value::as_bool).unwrap_or(false),
                    "Claude groups cannot depend on the active subscription"
                );
            }
            let members = strings(group, "proxies")?;
            let used = strings(group, "use")?;
            ensure!(
                !members.is_empty() || !used.is_empty(),
                "Claude groups require an outbound or provider"
            );
            ensure!(
                members.iter().all(|member| builtin(member) || names.contains(member)),
                "Claude group references an undefined outbound"
            );
            ensure!(
                used.iter().all(|provider| providers.contains(provider)),
                "Claude group references an undefined provider"
            );
        }
        ensure!(!self.exit_names.is_empty(), "Configure at least one Claude exit");
        let exits: HashSet<_> = self.exit_names.iter().collect();
        ensure!(exits.len() == self.exit_names.len(), "Duplicate Claude exit name");
        ensure!(
            self.exit_names
                .iter()
                .all(|exit| builtin(exit) || names.contains(exit.as_str())),
            "Claude exit is not defined in the endpoint configuration"
        );
        ensure!(
            self.exit_names.contains(&self.selected_exit),
            "Select a configured Claude exit"
        );
        if self.enabled {
            validate_protected_outbound(&self.selected_exit, &endpoints, &mut HashSet::new())?;
        }
        Ok(())
    }

    pub fn apply(&self, config: Mapping) -> Result<Mapping> {
        self.apply_service(config, GROUP, PREFIX, claude_rules(), "claude-providers")
    }

    pub fn apply_codex(&self, config: Mapping) -> Result<Mapping> {
        self.apply_service(config, "Codex-Verge", "Codex-Verge:", codex_rules(), "codex-providers")
    }

    fn apply_service(
        &self,
        mut config: Mapping,
        group_name: &str,
        prefix: &str,
        service_rules: Vec<Value>,
        provider_dir: &str,
    ) -> Result<Mapping> {
        if !self.enabled {
            return Ok(config);
        }
        let service_rules = match &self.rules {
            Some(rules) => match custom_rules(rules, group_name) {
                Ok(rules) => rules,
                Err(_) => return Ok(reject_service(config, &service_rules, group_name)),
            },
            None => service_rules,
        };
        if self.validate().is_err() {
            return Ok(reject_service(config, &service_rules, group_name));
        }
        let mut endpoints = self.endpoints()?;
        // Subscription extensions run first, but cannot claim our persisted control names.
        for key in ["proxies", "proxy-groups"] {
            if let Some(existing) = config.get(key).and_then(Value::as_sequence) {
                if existing
                    .iter()
                    .filter_map(|item| item.get("name").and_then(Value::as_str))
                    .any(|name| name == group_name || name.starts_with(prefix))
                {
                    return Ok(reject_service(config, &service_rules, group_name));
                }
            }
        }
        if let Some(existing) = config.get("proxy-providers").and_then(Value::as_mapping) {
            if existing
                .keys()
                .filter_map(Value::as_str)
                .any(|name| name.starts_with(prefix))
            {
                return Ok(reject_service(config, &service_rules, group_name));
            }
        }
        for node in &mut endpoints.proxies {
            node.insert("name".into(), outbound(name(node)?, prefix).into());
            rewrite_reference(node, "dialer-proxy", prefix);
        }
        for group in &mut endpoints.groups {
            group.insert("name".into(), outbound(name(group)?, prefix).into());
            rewrite_list(group, "proxies", prefix)?;
            rewrite_list(group, "use", prefix)?;
            group.insert("empty-fallback".into(), "REJECT".into());
            group.insert("hidden".into(), true.into());
        }
        let mut providers = config
            .get("proxy-providers")
            .and_then(Value::as_mapping)
            .cloned()
            .unwrap_or_default();
        for (key, value) in &endpoints.providers {
            let provider_name = key.as_str().unwrap_or_default();
            let mut provider = value.as_mapping().cloned().unwrap_or_default();
            rewrite_reference(&mut provider, "proxy", prefix);
            let mut overrides = provider
                .get("override")
                .and_then(Value::as_mapping)
                .cloned()
                .unwrap_or_default();
            rewrite_reference(&mut overrides, "dialer-proxy", prefix);
            let additional_prefix = overrides
                .get("additional-prefix")
                .and_then(Value::as_str)
                .unwrap_or_default();
            overrides.insert(
                "additional-prefix".into(),
                format!("{prefix}{provider_name}:{additional_prefix}").into(),
            );
            provider.insert("override".into(), Value::Mapping(overrides));
            let safe_name: String = provider_name
                .as_bytes()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect();
            provider.insert("path".into(), format!("./{provider_dir}/{safe_name}.yaml").into());
            if !provider.contains_key("interval") {
                provider.insert("interval".into(), 3600.into());
            }
            providers.insert(outbound(provider_name, prefix).into(), Value::Mapping(provider));
        }
        config.insert("proxy-providers".into(), Value::Mapping(providers));
        let mut control = Mapping::new();
        control.insert("name".into(), group_name.into());
        control.insert("type".into(), "select".into());
        control.insert(
            "proxies".into(),
            Value::Sequence(vec![outbound(&self.selected_exit, prefix).into()]),
        );
        control.insert("hidden".into(), true.into());
        control.insert("empty-fallback".into(), "REJECT".into());
        endpoints.groups.insert(0, control);
        for (key, items) in [("proxies", endpoints.proxies), ("proxy-groups", endpoints.groups)] {
            let mut combined: Vec<Value> = items.into_iter().map(Value::Mapping).collect();
            if let Some(existing) = config.get(key).and_then(Value::as_sequence) {
                combined.extend(existing.iter().cloned());
            }
            config.insert(key.into(), Value::Sequence(combined));
        }
        let mut rules = service_rules;
        if let Some(existing) = config.get("rules").and_then(Value::as_sequence) {
            rules.extend(existing.iter().cloned());
        }
        config.insert("rules".into(), Value::Sequence(rules));
        Ok(config)
    }
}

fn custom_rules(rules: &[String], group: &str) -> Result<Vec<Value>> {
    ensure!(
        !rules.is_empty() && rules.len() <= 1000,
        "Rules must contain 1–1000 entries"
    );
    rules
        .iter()
        .map(|rule| {
            let (kind, value) = rule
                .split_once(',')
                .ok_or_else(|| anyhow::anyhow!("Rule requires TYPE,VALUE"))?;
            let (kind, value) = (kind.trim(), value.trim());
            ensure!(
                !value.is_empty()
                    && value.len() <= 253
                    && !value.contains(',')
                    && !value.chars().any(char::is_whitespace),
                "Invalid rule value"
            );
            ensure!(
                matches!(
                    kind,
                    "DOMAIN" | "DOMAIN-SUFFIX" | "DOMAIN-KEYWORD" | "IP-CIDR" | "IP-CIDR6"
                ),
                "Unsupported rule type"
            );
            if matches!(kind, "IP-CIDR" | "IP-CIDR6") {
                let (address, bits) = value
                    .split_once('/')
                    .ok_or_else(|| anyhow::anyhow!("CIDR requires prefix length"))?;
                let address: std::net::IpAddr = address.parse()?;
                let bits: u8 = bits.parse()?;
                ensure!(
                    matches!(
                        (kind, address),
                        ("IP-CIDR", std::net::IpAddr::V4(_)) | ("IP-CIDR6", std::net::IpAddr::V6(_))
                    ),
                    "Invalid CIDR address family"
                );
                ensure!(bits <= if address.is_ipv4() { 32 } else { 128 }, "Invalid CIDR prefix");
            } else {
                ensure!(
                    value
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-' | b'_')),
                    "Invalid domain rule"
                );
            }
            Ok(format!(
                "{kind},{value},{group}{}",
                if kind.starts_with("IP-CIDR") { ",no-resolve" } else { "" }
            )
            .into())
        })
        .collect()
}

fn reject_service(mut config: Mapping, service_rules: &[Value], group_name: &str) -> Mapping {
    let mut rules: Vec<Value> = service_rules
        .iter()
        .filter_map(|rule| rule.as_str().map(|text| text.replace(group_name, "REJECT").into()))
        .collect();
    if let Some(existing) = config.get("rules").and_then(Value::as_sequence) {
        rules.extend(existing.iter().cloned());
    }
    config.insert("rules".into(), Value::Sequence(rules));
    config
}

// Net.Coffee OpenAI domain snapshot, reviewed 2026-11-25; update as service domains change.
fn codex_rules() -> Vec<Value> {
    "openai.com,chatgpt.com,chat.com,sora.com,oaistatic.com,oaiusercontent.com,crixet.com,openai.com.cdn.cloudflare.net,openaicom.imgix.net,openaiapi-site.azureedge.net,production-openaicom-storage.azureedge.net,openaicomproductionae4b.blob.core.windows.net,openaicom-api-bdcpf8c6d2e9atf6.z01.azurefd.net,webpubsub.azure.com,client-api.arkoselabs.com,openai-api.arkoselabs.com,chatgpt.livekit.cloud,host.livekit.cloud,turn.livekit.cloud,o33249.ingest.sentry.io,browser-intake-datadoghq.com"
        .split(',')
        .map(|domain| format!("DOMAIN-SUFFIX,{domain},Codex-Verge").into())
        .collect()
}

pub fn default_service_rules(service: &str) -> Result<Vec<String>> {
    let rules = match service {
        "Claude" => claude_rules(),
        "Codex" => codex_rules(),
        _ => bail!("Unknown routing service"),
    };
    Ok(rules
        .into_iter()
        .filter_map(|rule| {
            let text = rule.as_str()?;
            let mut pieces = text.split(',');
            Some(format!("{},{}", pieces.next()?, pieces.next()?))
        })
        .collect())
}

// CleanIP Claude rules, reviewed 2026-11-25. This is a versioned snapshot, not a remote executable script.
fn claude_rules() -> Vec<Value> {
    let domains = "claude.ai,anthropic.com,claude.com,claudeusercontent.com,claude.app,claudemcpcontent.com,clau.de,intercom.io,intercomcdn.com,intercomassets.com,intercom-messenger.com,us5.datadoghq.com,browser-intake-us5-datadoghq.com,r.stripe.com,us.sentry.io,siftscience.com,fcmtoken.googleapis.com,claudemcpclient.com,servd-anthropic-website.b-cdn.net,anthropic.auth0.com,anthropic-com.ghost.io,anthropic.com.cdn.cloudflare.net,claude.dev,claude.site,claudeacademy.com,claude.new,ant.dev,anthropic.team,antspace.dev,chatbotclaude.com,claudepages.dev,claudestudio.com,hcaptcha.com,challenges.cloudflare.com,withpersona.com,yoti.com,statsigapi.net,usefathom.com";
    domains
        .split(',')
        .map(|domain| format!("DOMAIN-SUFFIX,{domain},{GROUP}").into())
        .chain(
            ["34.8.0.0/16", "160.79.104.0/21", "153.61.208.0/20", "153.61.224.0/22"]
                .into_iter()
                .map(|cidr| format!("IP-CIDR,{cidr},{GROUP},no-resolve").into()),
        )
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edited_rules_are_scoped_and_invalid_rules_fail_closed() -> Result<()> {
        let mut settings = routing();
        settings.rules = Some(vec!["DOMAIN-SUFFIX,example.com".into(), "IP-CIDR,10.1.0.0/16".into()]);
        let config = settings.apply(Mapping::new())?;
        assert_eq!(
            config["rules"][0].as_str(),
            Some("DOMAIN-SUFFIX,example.com,Claude-Verge")
        );
        assert_eq!(
            config["rules"][1].as_str(),
            Some("IP-CIDR,10.1.0.0/16,Claude-Verge,no-resolve")
        );
        settings.rules = Some(vec!["DOMAIN,example.com,DIRECT".into()]);
        assert!(settings.validate().is_err());
        assert_eq!(
            settings.apply(Mapping::new())?["rules"][0].as_str(),
            Some("DOMAIN-SUFFIX,claude.ai,REJECT")
        );
        assert!(default_service_rules("Claude")?.contains(&"DOMAIN-SUFFIX,claude.ai".to_string()));
        Ok(())
    }

    #[test]
    fn codex_and_claude_keep_independent_exits_and_fail_closed() -> Result<()> {
        let claude = routing();
        let mut codex = routing();
        codex.selected_exit = "Static".into();
        let combined = codex.apply_codex(claude.apply(Mapping::new())?)?;
        let groups = combined["proxy-groups"].as_sequence().unwrap();
        assert!(
            groups
                .iter()
                .any(|g| g["name"].as_str() == Some("Claude-Verge")
                    && g["proxies"][0].as_str() == Some("Claude-Verge:US"))
        );
        assert!(groups.iter().any(
            |g| g["name"].as_str() == Some("Codex-Verge") && g["proxies"][0].as_str() == Some("Codex-Verge:Static")
        ));
        assert!(
            combined["rules"]
                .as_sequence()
                .unwrap()
                .iter()
                .any(|r| r.as_str() == Some("DOMAIN-SUFFIX,openai.com,Codex-Verge"))
        );
        assert!(
            combined["rules"]
                .as_sequence()
                .unwrap()
                .iter()
                .any(|r| r.as_str() == Some("DOMAIN-SUFFIX,claude.ai,Claude-Verge"))
        );
        codex.selected_exit = "missing".into();
        let rejected = codex.apply_codex(Mapping::new())?;
        assert_eq!(rejected["rules"][0].as_str(), Some("DOMAIN-SUFFIX,openai.com,REJECT"));
        codex.enabled = false;
        let unchanged = claude.apply(Mapping::new())?;
        assert_eq!(codex.apply_codex(unchanged.clone())?, unchanged);
        Ok(())
    }

    fn routing() -> ClaudeRouting {
        ClaudeRouting { enabled: true, selected_exit: "US".into(), exit_names: vec!["US".into(), "Static".into()], configuration: "proxies:\n  - {name: Static, type: http, server: example.com, port: 8080}\nproxy-providers:\n  VPS: {type: http, url: 'https://example.com/sub', path: '../../unsafe.yaml'}\nproxy-groups:\n  - {name: US, type: select, proxies: [Static]}\n".into(), rules: None }
    }

    #[test]
    fn off_preserves_subscription_and_on_preserves_unrelated_rules() -> Result<()> {
        let original: Mapping =
            serde_yaml_ng::from_str("rules: ['DOMAIN-SUFFIX,intranet.test,DIRECT', 'MATCH,DIRECT']")?;
        let mut settings = routing();
        settings.enabled = false;
        assert_eq!(settings.apply(original.clone())?, original);
        settings.enabled = true;
        let generated = settings.apply(original)?;
        let rules = generated["rules"].as_sequence().unwrap();
        assert_eq!(rules.len(), 44);
        assert_eq!(rules[0].as_str(), Some("DOMAIN-SUFFIX,claude.ai,Claude-Verge"));
        assert_eq!(rules[42].as_str(), Some("DOMAIN-SUFFIX,intranet.test,DIRECT"));
        assert_eq!(
            generated["proxy-groups"][0]["proxies"][0].as_str(),
            Some("Claude-Verge:US")
        );
        assert_eq!(generated["proxy-groups"][1]["empty-fallback"].as_str(), Some("REJECT"));
        assert_eq!(
            generated["proxy-providers"]["Claude-Verge:VPS"]["path"].as_str(),
            Some("./claude-providers/565053.yaml")
        );
        Ok(())
    }

    #[test]
    fn validates_missing_references_and_rejects_control_plane_keys() {
        let mut settings = routing();
        settings.selected_exit = "Missing".into();
        assert!(settings.validate().is_err());
        settings = routing();
        settings.configuration.push_str("mixed-port: 7897\n");
        assert!(settings.validate().is_err());
        settings = routing();
        settings.configuration = settings.configuration.replace("proxies: [Static]", "use: [Missing]");
        assert!(settings.validate().is_err());
        settings = routing();
        settings.configuration = settings.configuration.replace("name: Static", "name: US");
        assert!(settings.validate().is_err());
    }

    #[test]
    fn namespacing_survives_a_subscription_with_the_same_exit_name() -> Result<()> {
        let original: Mapping = serde_yaml_ng::from_str(
            "proxies: [{name: Static, type: http, server: other.example, port: 80}]\nproxy-groups: [{name: US, type: select, proxies: [Static]}]",
        )?;
        let mut settings = routing();
        let generated = settings.apply(original.clone())?;
        assert_eq!(generated["proxies"][0]["name"].as_str(), Some("Claude-Verge:Static"));
        assert_eq!(generated["proxies"][1]["name"].as_str(), Some("Static"));
        settings.selected_exit = "Static".into();
        let changed = settings.apply(original)?;
        assert_eq!(
            changed["proxy-groups"][0]["proxies"][0].as_str(),
            Some("Claude-Verge:Static")
        );
        let conflict: Mapping =
            serde_yaml_ng::from_str("proxy-groups: [{name: Claude-Verge, type: select, proxies: [DIRECT]}]")?;
        assert_eq!(
            settings.apply(conflict)?["rules"][0].as_str(),
            Some("DOMAIN-SUFFIX,claude.ai,REJECT")
        );
        Ok(())
    }

    #[test]
    fn empty_enabled_settings_are_invalid_and_debug_hides_credentials() {
        let mut settings = ClaudeRouting::default();
        assert!(settings.validate().is_ok());
        settings.enabled = true;
        assert!(settings.validate().is_err());
        settings = routing();
        assert!(!format!("{settings:?}").contains("example.com"));
    }

    #[test]
    fn builtins_require_an_explicit_exit_and_provider_references_are_isolated() -> Result<()> {
        let mut settings = routing();
        settings.selected_exit = "DIRECT".into();
        assert!(settings.validate().is_err());
        settings.exit_names.push("DIRECT".into());
        assert!(settings.validate().is_err());
        assert_eq!(
            settings.apply(Mapping::new())?["rules"][0].as_str(),
            Some("DOMAIN-SUFFIX,claude.ai,REJECT")
        );

        settings = routing();
        settings.configuration = settings.configuration.replace(
            "path: '../../unsafe.yaml'",
            "proxy: Static, override: {dialer-proxy: Static}",
        );
        let generated = settings.apply(Mapping::new())?;
        let provider = &generated["proxy-providers"]["Claude-Verge:VPS"];
        assert_eq!(provider["proxy"].as_str(), Some("Claude-Verge:Static"));
        assert_eq!(
            provider["override"]["dialer-proxy"].as_str(),
            Some("Claude-Verge:Static")
        );
        settings.configuration = settings
            .configuration
            .replace("dialer-proxy: Static", "dialer-proxy: Missing");
        assert!(settings.validate().is_err());

        settings = routing();
        settings.configuration = settings.configuration.replace("VPS", "DIRECT");
        assert!(settings.validate().is_err());
        settings = routing();
        settings.configuration = settings
            .configuration
            .replace("path: '../../unsafe.yaml'", "payload: []");
        assert!(settings.validate().is_err());
        settings = routing();
        settings
            .configuration
            .push_str("script: {code: 'function main() {}'}\n");
        assert!(settings.validate().is_err());
        Ok(())
    }

    #[test]
    fn protected_exits_reject_direct_switching_and_dynamic_providers() {
        let original = routing();
        for (from, to) in [
            ("proxies: [Static]", "proxies: [DIRECT]"),
            ("type: select, proxies: [Static]", "type: fallback, proxies: [Static]"),
            ("proxies: [Static]", "proxies: [Static, REJECT]"),
            ("proxies: [Static]", "use: [VPS]"),
        ] {
            let mut candidate = original.clone();
            candidate.configuration = candidate.configuration.replace(from, to);
            assert!(candidate.validate().is_err());
            candidate.enabled = false;
            assert!(candidate.validate().is_ok());
        }
    }
}
