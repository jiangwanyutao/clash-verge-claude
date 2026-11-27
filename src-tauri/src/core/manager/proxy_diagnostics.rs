// Only controlled labels are emitted: core messages can contain credentials and URLs.
pub(crate) fn proxy_failure_summary(message: &str) -> Option<(&'static str, &'static str)> {
    if !message.contains("dial ") || !message.contains(" error:") || message.contains("dial DIRECT ") {
        return None;
    }
    let service = if message.contains("Claude-Verge") {
        "claude"
    } else if message.contains("Codex-Verge") {
        "codex"
    } else {
        "other-proxy-or-group"
    };
    let lower = message.rsplit_once(" error:")?.1.to_ascii_lowercase();
    let kind = if lower.contains("timeout") || lower.contains("deadline exceeded") {
        "timeout"
    } else if lower.contains("connection refused") || lower.contains("actively refused") {
        "refused"
    } else if lower.contains("connection reset") {
        "reset"
    } else if lower.contains("unexpected eof") || lower.trim().starts_with("eof") || lower.contains("error: eof") {
        "eof"
    } else if lower.contains("no such host") || lower.contains("dns") {
        "dns"
    } else if lower.contains("tls") || lower.contains("handshake") {
        "handshake"
    } else {
        "other"
    };
    Some((service, kind))
}

#[cfg(test)]
mod tests {
    use super::proxy_failure_summary;

    #[test]
    fn classifies_proxy_failure_without_copying_sensitive_details() {
        let line = "[TCP] dial Claude-Verge (match Domain/x) 127.0.0.1 --> secret.example error: secret-host:443 connect error: context deadline exceeded";
        assert_eq!(proxy_failure_summary(line), Some(("claude", "timeout")));
        assert_eq!(
            proxy_failure_summary("[TCP] dial group --> host error: proxy connect error: EOF"),
            Some(("other-proxy-or-group", "eof"))
        );
        assert_eq!(proxy_failure_summary("[TCP] dial DIRECT --> host error: timeout"), None);
        assert_eq!(proxy_failure_summary("[TCP] dial group --> host"), None);
    }
}
