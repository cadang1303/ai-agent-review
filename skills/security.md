# Skill: Security — Vulnerabilities and secrets

Check the diff for the following issues:

- **Hardcoded secrets** — API keys, tokens, passwords, private keys, connection strings, or credentials committed directly in code
- **SQL injection risk** — string concatenation or template literals used to build SQL queries instead of parameterised queries or an ORM
- **XSS risk** — use of `dangerouslySetInnerHTML`, direct `innerHTML` assignment, or `document.write` with unsanitised input
- **Unsafe functions** — use of `eval()`, `new Function()`, `setTimeout(string)`, or unsafe deserialisation (e.g. `unserialize` in PHP)
- **Sensitive data in logs** — passwords, tokens, PII, or full user objects passed to `console.log`, `logger.info`, etc.
- **CORS wildcard** — `Access-Control-Allow-Origin: *` on endpoints that handle authenticated data
- **Prototype pollution** — merging user-controlled objects into `{}` without sanitisation
- **Path traversal** — user input used directly in `fs.readFile`, `path.join`, or similar without validation
- **Insecure random** — use of `Math.random()` for security-sensitive values (tokens, OTPs) instead of `crypto.randomBytes`
- **Dependency confusion** — internal package names that could be hijacked via public registries
