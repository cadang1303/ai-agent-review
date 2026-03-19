---
name: code-quality
description: Reviews code changes for naming conventions, dead code, debug artifacts, magic numbers, and structural issues. Use this skill when you want to catch style and hygiene problems that reduce readability and long-term maintainability — things that are syntactically valid but violate team conventions or leave clutter in the codebase. This skill replaces and merges the separate convention and lint skills.
---

# Code Quality Review

You are reviewing a code diff for quality and style issues. Flag only what is visible in the diff — do not speculate about files not shown.

For each issue found, post a separate comment using this exact format:

```
🟡 [QUALITY] <RULE-ID>: <One sentence describing the problem and why it matters>.
Suggestion: <Concrete fix — show the corrected line or pattern when possible>.
```

Use 🔴 for issues that actively ship broken artifacts to production (debug statements in hot paths, unreachable code masking bugs). Use 🟡 for style and structural violations. Use 🔵 for minor nits and informational suggestions.

---

## Naming

**NQ-01 — Non-descriptive names**
Single-letter or abbreviated variable names are not allowed outside `for` loop counters or math utility functions.
- ❌ `const d = new Date()` → ✅ `const createdAt = new Date()`
- ❌ `function proc(u)` → ✅ `function processUser(user)`

**NQ-02 — Boolean naming**
Boolean variables and properties must use an `is`, `has`, `can`, or `should` prefix so their meaning is unambiguous at the call site.
- ❌ `let active = true` → ✅ `let isActive = true`
- ❌ `const admin = checkRole()` → ✅ `const isAdmin = checkRole()`

**NQ-03 — Function naming**
Functions must be named with a verb phrase that describes what they do, not what they return.
- ❌ `function userData()` → ✅ `function fetchUserData()`
- ❌ `function price(items)` → ✅ `function calculateTotalPrice(items)`

**NQ-04 — Naming case consistency**
Naming case must match the language/framework convention and must not be mixed within the same file.
- JS/TS: `camelCase` for variables/functions, `PascalCase` for classes and React components, `SCREAMING_SNAKE_CASE` for module-level constants.
- Python: `snake_case` for variables/functions, `PascalCase` for classes, `UPPER_CASE` for constants.
- ❌ Mixing `getUserData` and `get_user_data` in the same JS file.

---

## Magic values

**NQ-05 — Magic numbers**
Any numeric literal other than `0`, `1`, `-1`, or `2` that appears outside a loop counter must be extracted into a named constant. The constant name must explain the meaning, not just echo the value.
- ❌ `if (retries > 3)` → ✅ `const MAX_RETRIES = 3; if (retries > MAX_RETRIES)`
- ❌ `setTimeout(fn, 5000)` → ✅ `const SESSION_TIMEOUT_MS = 5000; setTimeout(fn, SESSION_TIMEOUT_MS)`

**NQ-06 — Repeated string literals**
Hard-coded string literals that appear more than once must be extracted into a named constant or enum. Strings that are UI-facing labels belong in a constants or i18n file.
- ❌ `if (status === 'pending') ... if (type === 'pending')` (repeated in two places)
- ✅ `const STATUS_PENDING = 'pending'`

---

## Dead and debug code

**NQ-07 — Debug statements** 🔴
`console.log`, `console.debug`, `print`, `debugger`, `dump`, `var_dump`, and similar debug statements must not appear in production code paths. Structured logging via a logger library (`logger.info(...)`, `log.debug(...)`) is acceptable.
- ❌ `console.log('user:', user)` in a route handler
- ✅ Remove entirely, or replace with `logger.debug('User loaded', { userId: user.id })`

**NQ-08 — Commented-out code**
Blocks of commented-out code must not be committed. Use git history to recover old implementations. A comment explaining *why* something was removed is acceptable; the removed code itself is not.
- ❌ `// const result = oldImplementation(x)` left in the file
- ✅ Remove the commented block entirely

**NQ-09 — Unused symbols**
Unused imports, unused variables, and unused function parameters must be removed.
- Exception: parameters intentionally unused may be prefixed with `_` (e.g., `_event`, `_req`) to signal intent — these should not be flagged.
- ❌ `import { debounce } from 'lodash'` with no usage in the file
- ❌ `const result = compute(); // result never read`

**NQ-10 — Unreachable code** 🔴
Statements that follow a `return`, `throw`, or `break` with no conditional path to reach them are unreachable. This almost always indicates a logic mistake, not just dead code.
- ❌ `return value; doCleanup();` — `doCleanup()` never runs

---

## Structure

**NQ-11 — Function length**
Functions longer than ~40 lines are a signal to extract sub-functions. Flag when a function visibly does more than one thing — a strong hint is two or more distinct comment blocks explaining separate steps inside a single function body.

**NQ-12 — Nesting depth**
More than 3 levels of nested `if`, `for`, `try`, or `switch` blocks should be refactored. Prefer early returns (guard clauses) or extracted helper functions to reduce nesting.
- ❌ `if (a) { if (b) { if (c) { if (d) { ... } } } }`
- ✅ `if (!a || !b || !c || !d) return; ...`

**NQ-13 — Mixed responsibilities** 🔵
A single file should have one clear responsibility. Flag new files that visibly mix unrelated concerns — for example, a file that contains UI rendering, API calls, and business logic transformation all together with no separation.

---

## Examples

**Good comment:**
```
🟡 [QUALITY] NQ-05: Magic number `3000` used directly in `setTimeout` with no explanation.
Suggestion: Extract to `const REQUEST_TIMEOUT_MS = 3000;` and reference that constant.
```

**Good comment:**
```
🔴 [QUALITY] NQ-07: `console.log('token:', authToken)` found in the request handler — this logs a sensitive value to stdout in production.
Suggestion: Remove the statement, or replace with `logger.debug('Auth token present', { tokenLength: authToken.length })`.
```

Post one comment per violation. Do not batch multiple rules into a single comment.
