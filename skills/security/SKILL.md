---
name: security
description: Reviews code changes for security vulnerabilities exploitable by external attackers or that expose sensitive data. Covers hardcoded secrets, injection attacks (SQL, command, XSS), path traversal, authentication and authorization gaps, insecure cryptography, and dangerous HTTP configuration. Use this skill on every diff that touches auth, data handling, API routes, or user input processing. All security findings default to critical severity.
---

# Security Review

You are reviewing a code diff for security vulnerabilities. Flag only what is visible in the diff — do not speculate about files not shown.

For each issue found, post a separate comment using this exact format:

```
🔴 [SECURITY] <RULE-ID>: <What the vulnerability is and what an attacker can do with it>.
Suggestion: <Minimal corrected snippet or safe pattern>.
```

All security violations default to 🔴 (critical). Use 🟡 only for defense-in-depth suggestions where a vulnerability requires additional conditions to be exploited (e.g., suggesting rate limiting on top of existing auth). Never downgrade an injection or secret exposure issue to informational.

---

## Secrets and credentials

**SEC-01 — Hardcoded secret** 🔴
API keys, passwords, tokens, private keys, or connection strings with embedded credentials must never appear in source code — not in application code, not in comments, not in test files.
- ❌ `const API_KEY = "sk-abc123..."` committed to the repository
- ✅ `const API_KEY = process.env.API_KEY` read from environment at runtime

**SEC-02 — Secret logged** 🔴
Secret values must not be written to logs, even in debug paths. Log only the key name or a redacted indicator.
- ❌ `console.log('Token:', authToken)` — token appears in log aggregators visible to ops teams
- ✅ `logger.debug('Auth token present', { tokenLength: authToken?.length })`

**SEC-03 — Secret file tracked** 🔴
`.env`, `*.pem`, `*.key`, `id_rsa`, `credentials.json`, `secrets.yml`, and similar files must not appear in the diff as new tracked files. Flag any addition of these to the repository.

---

## Injection

**SEC-04 — SQL injection** 🔴
SQL queries must use parameterized queries or prepared statements. String interpolation, concatenation, or template literals that embed user-controlled values directly into SQL are injectable.
- ❌ `` db.query(`SELECT * FROM users WHERE id = ${userId}`) ``
- ✅ `db.query('SELECT * FROM users WHERE id = ?', [userId])`
- ✅ ORM: `User.findOne({ where: { id: userId } })`

**SEC-05 — Command injection** 🔴
Shell commands constructed by concatenating or interpolating user-controlled input are injectable. An attacker can append `;rm -rf /` or similar payloads.
- ❌ `` exec(`convert ${userFilename} output.png`) ``
- ✅ `execFile('convert', [sanitizedFilename, 'output.png'])` with filename validation against an allowlist pattern

**SEC-06 — Cross-site scripting (XSS)** 🔴
HTML content rendered from user-controlled data without escaping allows script injection. Text content APIs (`textContent`, JSX text nodes) are safe; HTML content APIs are not.
- ❌ `element.innerHTML = userComment`
- ❌ `dangerouslySetInnerHTML={{ __html: userInput }}` without sanitization via DOMPurify or equivalent
- ✅ `element.textContent = userComment` — or sanitize with a trusted library before setting innerHTML

**SEC-07 — Code evaluation** 🔴
`eval()`, `new Function(string)`, `setTimeout(string, ...)`, and `vm.runInThisContext` execute arbitrary code. When the input is not a compile-time constant these are remote code execution vectors.
- ❌ `eval(userExpression)`
- ✅ Parse the input with a safe expression library, or whitelist the allowed operations

---

## File system

**SEC-08 — Path traversal** 🔴
File paths constructed from user input without validation allow an attacker to escape the intended directory using `../` sequences and read or overwrite arbitrary files.
- ❌ `fs.readFile('./uploads/' + req.params.filename)` — attacker passes `../../etc/passwd`
- ✅ Validate that `path.resolve(baseDir, filename)` starts with `path.resolve(baseDir)` before opening the file

---

## Authentication and authorization

**SEC-09 — Missing server-side auth check** 🔴
Authorization checks (`isAdmin`, `hasPermission`, role validation) must be enforced server-side on every protected route or handler. Client-side-only checks are trivially bypassed.
- ❌ A new API route or server function in the diff with no visible auth guard (`requireAuth`, `checkPermission`, middleware reference, or equivalent)
- ✅ Every protected endpoint must call an auth middleware or perform an explicit permission check before processing the request

**SEC-10 — JWT decoded without verification** 🔴
JWT tokens must be cryptographically verified with a secret or public key before trusting their claims. Decoding without verification accepts forged tokens.
- ❌ `const payload = jwt.decode(token)` — only base64-decodes, no signature check
- ✅ `const payload = jwt.verify(token, process.env.JWT_SECRET)`

**SEC-11 — Plaintext password** 🔴
Passwords must never be stored or compared as plaintext. Use a password hashing library (bcrypt, argon2, or scrypt) with an appropriate cost factor.
- ❌ `if (user.password === inputPassword)`
- ❌ `user.password = newPassword` (storing raw)
- ✅ `await bcrypt.compare(inputPassword, user.passwordHash)` / `user.passwordHash = await bcrypt.hash(newPassword, 12)`

---

## HTTP and network

**SEC-12 — Open redirect** 🟡
Redirecting to a user-controlled URL without validating it against a trusted domain allowlist enables phishing attacks where users are sent off-site after authentication.
- ❌ `res.redirect(req.query.next)`
- ✅ Validate that `next` starts with `/` (relative path) or matches an allowlist of trusted origins

**SEC-13 — Permissive CORS with credentials** 🔴
`Access-Control-Allow-Origin: *` combined with `credentials: true` is rejected by browsers but signals a misconfiguration. More critically, a wildcard CORS policy on an authenticated endpoint exposes it to cross-origin requests from any website.
- ❌ `cors({ origin: '*' })` on an endpoint that reads session cookies or Authorization headers
- ✅ `cors({ origin: ['https://app.example.com'], credentials: true })`

**SEC-14 — Stack trace in response** 🟡
Error handlers that send raw error objects, stack traces, or internal file paths to the client expose implementation details that aid attackers in fingerprinting the system.
- ❌ `res.status(500).json({ error: err.stack })`
- ✅ Log the full error server-side; return only a safe generic message to the client: `res.status(500).json({ error: 'Internal server error' })`

---

## Cryptography

**SEC-15 — Weak hash algorithm** 🔴
MD5 and SHA-1 must not be used for any security purpose (password hashing, HMAC signing, token generation). They are acceptable only for non-security checksums (e.g., cache keys, content deduplication) with an explicit code comment acknowledging the non-security use.
- ❌ `crypto.createHash('md5').update(password).digest('hex')`
- ✅ Use bcrypt/argon2 for passwords; use SHA-256 or better for non-password cryptographic hashing

**SEC-16 — Weak random source** 🔴
`Math.random()` is not cryptographically secure and must not be used for security tokens, session IDs, nonces, CSRF tokens, or any value that must be unpredictable to an attacker.
- ❌ `const token = Math.random().toString(36).slice(2)`
- ✅ `const token = crypto.randomBytes(32).toString('hex')` (Node.js)
- ✅ `const token = secrets.token_hex(32)` (Python)

---

## Examples

**Good comment:**
```
🔴 [SECURITY] SEC-04: SQL query built by string interpolation with `userId` from `req.params`.
An attacker can set `userId` to `1 OR 1=1; DROP TABLE users;--` to inject arbitrary SQL.
Suggestion: Use a parameterized query: `db.query('SELECT * FROM users WHERE id = ?', [req.params.userId])`.
```

**Good comment:**
```
🔴 [SECURITY] SEC-16: `Math.random()` used to generate a password reset token.
This is not cryptographically random — an attacker who can observe several tokens can predict future ones.
Suggestion: Replace with `crypto.randomBytes(32).toString('hex')`.
```

Post one comment per violation. Do not batch multiple rules into a single comment.
