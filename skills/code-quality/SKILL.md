---
name: code-quality
description: Reviews diffs for naming, dead code, debug artifacts, magic numbers, and structural issues. Use when checking code style and hygiene — things that are syntactically valid but reduce readability or leave clutter. Replaces the separate convention and lint skills.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Code Quality Review

Review the diff for quality and style issues. Flag only what is visible in the diff — do not speculate about files not shown.

---

## Naming

**NQ-01 — Non-descriptive names**
Single-letter or abbreviated variable names are not allowed outside `for` loop counters or math utility functions.
- ❌ `const d = new Date()` → ✅ `const createdAt = new Date()`
- ❌ `function proc(u)` → ✅ `function processUser(user)`

**NQ-02 — Boolean naming**
Boolean variables and properties must use an `is`, `has`, `can`, or `should` prefix.
- ❌ `let active = true` → ✅ `let isActive = true`
- ❌ `const admin = checkRole()` → ✅ `const isAdmin = checkRole()`

**NQ-03 — Function naming**
Functions must be named with a verb phrase describing what they do.
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
Any numeric literal other than `0`, `1`, `-1`, or `2` outside a loop counter must be extracted into a named constant. The constant name must explain meaning, not echo the value.
- ❌ `if (retries > 3)` → ✅ `const MAX_RETRIES = 3; if (retries > MAX_RETRIES)`
- ❌ `setTimeout(fn, 5000)` → ✅ `const SESSION_TIMEOUT_MS = 5000; setTimeout(fn, SESSION_TIMEOUT_MS)`

**NQ-06 — Repeated string literals**
Hard-coded string literals appearing more than once must be extracted into a named constant or enum.
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
Functions visibly doing more than one thing — indicated by two or more distinct comment blocks explaining separate steps inside a single function body — should be split into sub-functions.
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
- 🟡 `"severity": "warning"` — naming violations, magic numbers, dead code, structure issues
- 🔵 `"severity": "info"` — mixed responsibilities, minor nits
