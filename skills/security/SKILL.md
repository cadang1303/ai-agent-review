---
name: security
description: Reviews diffs for security vulnerabilities exploitable by external attackers or that expose sensitive data. Covers hardcoded secrets, injection attacks (SQL, command, XSS), path traversal, auth gaps, insecure cryptography, and dangerous HTTP config. Use on every diff touching auth, data handling, API routes, or user input processing.
---

# Security Review

Review only visible diff changes. Don't speculate about files not shown.
All violations default to 🔴. Use 🟡 only where exploitation requires additional conditions.

---

## Secrets

**SEC-01 — Hardcoded secret** 🔴
API keys, passwords, tokens, or connection strings must never appear in source code.
- ❌ `const API_KEY = "sk-abc123"` → ✅ `process.env.API_KEY`

**SEC-02 — Secret logged** 🔴
Log only the key name or a redacted indicator, never the value.
- ❌ `console.log('Token:', authToken)` → ✅ `logger.debug('Auth token present', { tokenLength: authToken?.length })`

**SEC-03 — Secret file tracked** 🔴
`.env`, `*.pem`, `*.key`, `*.p12`, `id_rsa`, `credentials.json`, `secrets.yml` must not appear as new tracked files.

---

## Injection

**SEC-04 — SQL injection** 🔴
Use parameterized queries. Never interpolate user input into SQL.
- ❌ `` db.query(`SELECT * FROM users WHERE id = ${userId}`) ``
- ✅ `db.query('SELECT * FROM users WHERE id = ?', [userId])`

**SEC-05 — Command injection** 🔴
Use `execFile` with an allowlist, never `exec` with interpolated user input.
- ❌ `` exec(`convert ${userFilename} output.png`) ``

**SEC-06 — XSS** 🔴
Never set HTML content from user-controlled data without sanitization.
- ❌ `element.innerHTML = userComment` / `dangerouslySetInnerHTML={{ __html: userInput }}`
- ✅ `element.textContent = userComment` or sanitize with DOMPurify first

**SEC-07 — Code evaluation** 🔴
`eval()`, `new Function(string)`, `setTimeout(string)` are RCE vectors when input is not a compile-time constant.

---

## File system

**SEC-08 — Path traversal** 🔴
Validate that `path.resolve(baseDir, filename).startsWith(path.resolve(baseDir))` before opening any user-supplied path.
- ❌ `fs.readFile('./uploads/' + req.params.filename)`

---

## Auth

**SEC-09 — Missing server-side auth check** 🔴
Flag any new API route with no visible auth guard (`requireAuth`, middleware, or explicit permission check).

**SEC-10 — JWT decoded without verification** 🔴
- ❌ `jwt.decode(token)` → ✅ `jwt.verify(token, process.env.JWT_SECRET)`

**SEC-11 — Plaintext password** 🔴
Passwords must be hashed with bcrypt, argon2, or scrypt — never stored or compared as plaintext.
- ❌ `if (user.password === inputPassword)` → ✅ `await bcrypt.compare(inputPassword, user.passwordHash)`

---

## HTTP

**SEC-12 — Open redirect** 🟡
Validate redirect target against a trusted-domain allowlist or require a leading `/`.
- ❌ `res.redirect(req.query.next)`

**SEC-13 — Permissive CORS with credentials** 🔴
- ❌ `cors({ origin: '*' })` on an authenticated endpoint
- ✅ `cors({ origin: ['https://app.example.com'], credentials: true })`

**SEC-14 — Stack trace in response** 🟡
Log full errors server-side; return only a generic message to the client.
- ❌ `res.status(500).json({ error: err.stack })`

---

## Cryptography

**SEC-15 — Weak hash** 🔴
MD5 and SHA-1 must not be used for any security purpose. Use bcrypt/argon2 for passwords; SHA-256+ otherwise.

**SEC-16 — Weak random** 🔴
`Math.random()` must not be used for tokens, session IDs, nonces, or CSRF tokens.
- ✅ `crypto.randomBytes(32).toString('hex')` / `secrets.token_hex(32)`

---

> See `_shared/shared-config.md` for severity guide and output format.