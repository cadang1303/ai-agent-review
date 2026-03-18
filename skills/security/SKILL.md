---
name: security
description: Reviews code diffs for security vulnerabilities. Use when checking for hardcoded secrets, SQL injection, XSS, unsafe functions, exposed sensitive data, path traversal, or insecure random number usage.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Security — Vulnerabilities and Secrets

Check the diff for the following issues:

## Secrets and credentials
- **Hardcoded secrets** — API keys, tokens, passwords, private keys, connection strings, or credentials committed directly in code
- **Sensitive data in logs** — passwords, tokens, PII, or full user objects passed to `console.log`, `logger.info`, etc.

## Injection risks
- **SQL injection** — string concatenation or template literals used to build SQL queries instead of parameterised queries or an ORM
- **XSS risk** — use of `dangerouslySetInnerHTML`, direct `innerHTML` assignment, or `document.write` with unsanitised input
- **Path traversal** — user input used directly in `fs.readFile`, `path.join`, or similar without validation

## Unsafe APIs
- **Unsafe functions** — use of `eval()`, `new Function()`, `setTimeout(string)`, or unsafe deserialisation (e.g. `unserialize` in PHP)
- **Insecure random** — use of `Math.random()` for security-sensitive values (tokens, OTPs) instead of `crypto.randomBytes`
- **Prototype pollution** — merging user-controlled objects into `{}` without sanitisation

## Configuration
- **CORS wildcard** — `Access-Control-Allow-Origin: *` on endpoints that handle authenticated data
- **Dependency confusion** — internal package names that could be hijacked via public registries

## Response format
Return findings as JSON comments with `"skill": "security"`. Mark credential exposure and injection issues as `"severity": "error"`.
