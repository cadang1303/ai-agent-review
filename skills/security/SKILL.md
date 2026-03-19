---
name: security
description: Reviews diffs for security vulnerabilities exploitable by external attackers or that expose sensitive data. Covers hardcoded secrets, injection attacks (SQL, command, XSS), path traversal, auth gaps, insecure cryptography, and dangerous HTTP config. Use on every diff touching auth, data handling, API routes, or user input processing.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Security Review

Review the diff for security vulnerabilities. Flag only what is visible in the diff — do not speculate about files not shown.

All security violations default to 🔴 (critical). Use 🟡 only for defense-in-depth suggestions where exploitation requires additional conditions. Never downgrade an injection or secret exposure issue to informational.

---

## Secrets and credentials

**SEC-01 — Hardcoded secret**
API keys, passwords, tokens, private keys, or connection strings with embedded credentials must never appear in source code — not in application code, not in comments, not in test files.
- ❌ `const API_KEY = "sk-abc123..."` committed to the repository
- ✅ `const API_KEY = process.env.API_KEY` read from environment at runtime
- Severity: 🔴

**SEC-02 — Secret logged**
Secret values must not be written to logs, even in debug paths. Log only the key name or a redacted indicator.
- ❌ `console.log('Token:', authToken)` — token appears in log aggregators
- ✅ `logger.debug('Auth token present', { tokenLength: authToken?.length })`
- Severity: 🔴

**SEC-03 — Secret file tracked**
`.env`, `*.pem`, `*.key`, `*.p12`, `*.jks`, `id_rsa`, `credentials.json`, `service-account*.json`, `secrets.yml`, and similar files must not appear in the diff as new tracked files.
- Severity: 🔴

---

## Injection

**SEC-04 — SQL injection**
SQL queries must use parameterized queries or prepared statements. String interpolation or concatenation embedding user-controlled values directly into SQL is injectable.
- ❌ `` db.query(`SELECT * FROM users WHERE id = ${userId}`) ``
- ✅ `db.query('SELECT * FROM users WHERE id = ?', [userId])`
- ✅ ORM: `User.findOne({ where: { id: userId } })`
- Severity: 🔴

**SEC-05 — Command injection**
Shell commands constructed by concatenating or interpolating user-controlled input are injectable.
- ❌ `` exec(`convert ${userFilename} output.png`) ``
- ✅ `execFile('convert', [sanitizedFilename, 'output.png'])` with filename validated against an allowlist pattern
- Severity: 🔴

**SEC-06 — Cross-site scripting (XSS)**
HTML content rendered from user-controlled data without escaping allows script injection. Text content APIs (`textContent`, JSX text nodes) are safe; HTML content APIs are not.
- ❌ `element.innerHTML = userComment`
- ❌ `dangerouslySetInnerHTML={{ __html: userInput }}` without sanitization
- ✅ `element.textContent = userComment` — or sanitize with DOMPurify before setting innerHTML
- Severity: 🔴

**SEC-07 — Code evaluation**
`eval()`, `new Function(string)`, `setTimeout(string, ...)`, and `vm.runInThisContext` execute arbitrary code. When input is not a compile-time constant these are remote code execution vectors.
- ❌ `eval(userExpression)`
- ✅ Parse with a safe expression library, or whitelist the allowed operations
- Severity: 🔴

---

## File system

**SEC-08 — Path traversal**
File paths constructed from user input without validation allow an attacker to escape the intended directory using `../` sequences and read or overwrite arbitrary files.
- ❌ `fs.readFile('./uploads/' + req.params.filename)` — attacker passes `../../etc/passwd`
- ✅ Validate that `path.resolve(baseDir, filename).startsWith(path.resolve(baseDir))` before opening
- Severity: 🔴

---

## Authentication and authorization

**SEC-09 — Missing server-side auth check**
Authorization checks must be enforced server-side on every protected route. Client-side-only checks are trivially bypassed.
- Flag: A new API route or server function in the diff with no visible auth guard (`requireAuth`, `checkPermission`, middleware reference, or equivalent)
- ✅ Every protected endpoint must call an auth middleware or perform an explicit permission check before processing
- Severity: 🔴

**SEC-10 — JWT decoded without verification**
JWT tokens must be cryptographically verified with a secret or public key before trusting their claims. Decoding without verification accepts forged tokens.
- ❌ `const payload = jwt.decode(token)` — only base64-decodes, no signature check
- ✅ `const payload = jwt.verify(token, process.env.JWT_SECRET)`
- Severity: 🔴

**SEC-11 — Plaintext password**
Passwords must never be stored or compared as plaintext. Use bcrypt, argon2, or scrypt with an appropriate cost factor.
- ❌ `if (user.password === inputPassword)`
- ❌ `user.password = newPassword` (storing raw)
- ✅ `await bcrypt.compare(inputPassword, user.passwordHash)` / `user.passwordHash = await bcrypt.hash(newPassword, 12)`
- Severity: 🔴

---

## HTTP and network

**SEC-12 — Open redirect**
Redirecting to a user-controlled URL without validating against a trusted domain allowlist enables phishing after authentication.
- ❌ `res.redirect(req.query.next)`
- ✅ Validate `next` starts with `/` (relative), or matches an allowlist of trusted origins
- Severity: 🟡

**SEC-13 — Permissive CORS with credentials**
A wildcard CORS policy on an authenticated endpoint exposes it to cross-origin requests from any website.
- ❌ `cors({ origin: '*' })` on an endpoint that reads session cookies or Authorization headers
- ✅ `cors({ origin: ['https://app.example.com'], credentials: true })`
- Severity: 🔴

**SEC-14 — Stack trace in response**
Error handlers that send raw error objects, stack traces, or internal file paths to the client expose implementation details that aid attackers.
- ❌ `res.status(500).json({ error: err.stack })`
- ✅ Log the full error server-side; return only `res.status(500).json({ error: 'Internal server error' })`
- Severity: 🟡

---

## Cryptography

**SEC-15 — Weak hash algorithm**
MD5 and SHA-1 must not be used for any security purpose. Acceptable only for non-security checksums with an explicit comment acknowledging the non-security use.
- ❌ `crypto.createHash('md5').update(password).digest('hex')`
- ✅ Use bcrypt/argon2 for passwords; SHA-256 or better for non-password cryptographic hashing
- Severity: 🔴

**SEC-16 — Weak random source**
`Math.random()` is not cryptographically secure and must not be used for tokens, session IDs, nonces, or CSRF tokens.
- ❌ `const token = Math.random().toString(36).slice(2)`
- ✅ Node.js: `crypto.randomBytes(32).toString('hex')`
- ✅ Python: `secrets.token_hex(32)`
- Severity: 🔴

---

## Severity guide

Include the rule ID at the start of the `body` field in each JSON comment.
- 🔴 `"severity": "error"` — all security violations by default
- 🟡 `"severity": "warning"` — defense-in-depth suggestions where exploitation requires additional conditions
