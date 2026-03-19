---
name: code-quality
description: Reviews diffs for naming, dead code, debug artifacts, magic numbers, and structural issues. Use when checking code style and hygiene — things that are syntactically valid but reduce readability or leave clutter. Replaces the separate convention and lint skills.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Code Quality Review

Review the diff for quality and maintainability issues that are likely to cause defects, confusion, or future rework.
To reduce noise: do NOT comment on purely subjective preferences unless the diff clearly introduces inconsistency or meaningful risk.
Flag only what is visible in the diff — do not speculate about files not shown.

---

## Naming

**NQ-01 — Non-descriptive names**
Avoid single-letter or abbreviated names when they obscure intent and the meaning is not obvious from immediate context.
- ❌ `const d = new Date()` → ✅ `const createdAt = new Date()`
- ❌ `function proc(u)` → ✅ `function processUser(user)`
 - Do NOT flag short names that are conventional and local (e.g. `i`, `j`, `x`, `y`) when scope is tiny and intent is obvious.

**NQ-02 — Boolean naming**
Prefer `is/has/can/should` prefixes for booleans when the name would otherwise be ambiguous. Do NOT enforce if the diff is consistent with existing naming in that file/module.
- ❌ `let active = true` → ✅ `let isActive = true`
- ❌ `const admin = checkRole()` → ✅ `const isAdmin = checkRole()`

**NQ-03 — Function naming**
Prefer verb phrases for functions when the name does not already convey action. Do NOT flag established patterns unless confusing.
- ❌ `function userData()` → ✅ `function fetchUserData()`
- ❌ `function price(items)` → ✅ `function calculateTotalPrice(items)`

**NQ-04 — Naming case consistency**
Naming case must match the language convention and must not be mixed within the same file.
- JS/TS: `camelCase` for variables/functions, `PascalCase` for classes/React components, `SCREAMING_SNAKE_CASE` for module-level constants
- Python: `snake_case` for variables/functions, `PascalCase` for classes, `UPPER_CASE` for constants
- ❌ Mixing `getUserData` and `get_user_data` in the same JS file

---

## Magic values

**NQ-05 — Magic numbers**
Avoid introducing magic numbers when the meaning is non-obvious or the number is used in multiple places.
To reduce noise, ONLY flag when at least one of these is true:
- The same number is introduced in 2+ places in the diff, OR
- The number controls a policy/limit/retry/timeout/backoff/threshold and has unclear meaning, OR
- The number is security-sensitive or reliability-sensitive (timeouts, retries).
Do NOT flag common, self-explanatory constants such as HTTP status codes (200/404), or UI layout numbers when context is obvious.
The constant name must explain meaning, not echo the value.
- ❌ `if (retries > 3)` → ✅ `const MAX_RETRIES = 3; if (retries > MAX_RETRIES)`
- ❌ `setTimeout(fn, 5000)` → ✅ `const SESSION_TIMEOUT_MS = 5000; setTimeout(fn, SESSION_TIMEOUT_MS)`

**NQ-06 — Repeated string literals**
Hard-coded string literals appearing more than once should be extracted when they represent a domain value, event name, status, or key where drift would cause bugs.
Do NOT flag short one-off UI text or logging strings unless duplicated and meaningful.
- ❌ `if (status === 'pending') ... if (type === 'pending')` repeated in two places
- ✅ `const STATUS_PENDING = 'pending'`

---

## Dead and debug code

**NQ-07 — Debug statements**
`console.log`, `console.debug`, `print`, `debugger`, `dump`, `var_dump` must not appear in production code paths. Structured logging via a logger library is acceptable.
- ❌ `console.log('user:', user)` in a route handler
- ✅ Remove entirely, or replace with `logger.debug('User loaded', { userId: user.id })`
- Severity: 🔴 when logging sensitive values (tokens, passwords, PII); 🟡 otherwise

**NQ-08 — Commented-out code**
Blocks of commented-out code must not be committed. Use git history to recover old implementations.
- ❌ `// const result = oldImplementation(x)` left in the file
- ✅ Remove the commented block entirely
- Exception: a comment explaining *why* something was removed is acceptable; the removed code itself is not

**NQ-09 — Unused symbols**
Unused imports, unused variables, and unused function parameters must be removed.
- Exception: parameters intentionally unused may be prefixed with `_` (e.g. `_event`, `_req`) — do not flag these
- ❌ `import { debounce } from 'lodash'` with no usage
- ❌ `const result = compute()` where `result` is never read

**NQ-10 — Unreachable code**
Statements following a `return`, `throw`, or `break` with no conditional path to reach them almost always indicate a logic mistake — a required side effect is silently skipped.
- ❌ `return value; doCleanup();` — `doCleanup()` never runs
- Severity: 🔴 when the unreachable code is a cleanup step; 🟡 otherwise

---

## Structure

**NQ-11 — Function length**
Flag only when the diff clearly introduces a function that mixes multiple responsibilities and is hard to test/modify. Do NOT flag based on line count alone.
- ❌ A single 60-line function that validates input, calls DB, formats response, sends email, and logs the result
- ✅ Extract to `validateInput()`, `saveToDatabase()`, `sendNotification()` called from a thin coordinator

**NQ-12 — Nesting depth**
More than 3 levels of nested `if`, `for`, `try`, or `switch` blocks should be refactored using early returns or extracted helpers.
- ❌ `if (a) { if (b) { if (c) { if (d) { ... } } } }`
- ✅ `if (!a || !b || !c || !d) return; ...`

**NQ-13 — Mixed responsibilities**
A single file should have one clear responsibility. Flag new files that visibly mix unrelated concerns with no separation.
- ❌ A new file that contains UI rendering, API calls, and business logic transformation all together
- ✅ Separate into: a view component, a service layer, and a data transformer
- Severity: 🔵 (informational)

---

## Severity guide

Include the rule ID at the start of the `body` field in each JSON comment.
- 🔴 `"severity": "error"` — debug statements logging sensitive data, unreachable cleanup code
- 🟡 `"severity": "warning"` — changes likely to cause defects or ongoing maintenance pain (magic values with unclear meaning, debug code, unused symbols, hard-to-follow structure)
- 🔵 `"severity": "info"` — only when it's a clear improvement with low urgency and low noise
