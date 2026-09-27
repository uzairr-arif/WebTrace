# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ |

## Reporting a vulnerability

WebTrace is a local-first browser extension — it makes no network requests and
stores nothing outside your browser profile. Still, if you find a security
issue (for example: a way sensitive data escapes redaction, a privilege
escalation via the messaging API, or a supply-chain problem), please report it
responsibly:

1. **Preferred:** open a private GitHub
   [security advisory](https://github.com/webtrace/webtrace/security/advisories/new)
2. **Or:** open a regular issue *without* sensitive details and the maintainer
   will follow up privately.

Please do not disclose publicly until a fix is available.

## Scope notes for reporters

- The privacy boundary is described in [PRIVACY.md](PRIVACY.md). The key
  invariants: no network egress, no body capture, redaction before storage.
- The extension requests `webRequest` + `webNavigation` with `<all_urls>` —
  that is the product. Anything that lets those capabilities leak user data
  off-device is a real vulnerability.

## What is not a vulnerability

- "The extension can see the network traffic of pages I browse" — that is the
  stated purpose, identical to DevTools.
- Findings that require an attacker to already have local code execution on
  the machine.
