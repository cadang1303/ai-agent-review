---
name: code-quality
description: Reviews diffs for naming, dead code, debug artifacts, magic numbers, and structural issues. Use when checking code style and hygiene — things that are syntactically valid but reduce readability or leave clutter. Replaces the separate convention and lint skills.
---

# Code Quality Review

Review only visible diff changes. Skip purely subjective preferences unless the diff introduces clear inconsistency or meaningful risk.

---

## Naming

**NQ-01 — Non-descriptive names** 🟡
Avoid single-letter or abbreviated names when intent is non-obvious. Don't flag conventional short names (`i`, `j`, `x`, `y`) in tight loops.
- ❌ `const d = new Date()` → ✅ `const createdAt = new Date()`

**NQ-02 — Boolean naming** 🟡
Prefer `is/has/can/should` prefix when the name would otherwise be ambiguous. Don't enforce if consistent with existing style in that file.
- ❌ `let active = true` → ✅ `let isActive = true`

**NQ-03 — Function naming** 🟡
Prefer verb phrases. Don't flag established patterns unless confusing.
- ❌ `function userData()` → ✅ `function fetchUserData()`

**NQ-04 — Case consistency** 🟡
Must match language convention and must not be mixed within the same file.
- JS/TS: `camelCase` vars/functions · `PascalCase` classes/components · `SCREAMING_SNAKE_CASE` module constants
- Python: `snake_case` vars/functions · `PascalCase` classes · `UPPER_CASE` constants

---

## Magic values

**NQ-05 — Magic numbers** 🟡
Flag only when: the same number appears 2+ times in the diff, OR it controls a policy/limit/timeout/threshold with unclear meaning, OR it is security/reliability-sensitive.
Don't flag self-explanatory constants (HTTP status codes, obvious UI numbers).
- ❌ `if (retries > 3)` → ✅ `const MAX_RETRIES = 3; if (retries > MAX_RETRIES)`

**NQ-06 — Repeated string literals** 🟡
Hard-coded strings appearing 2+ times should be extracted when they represent domain values, event names, statuses, or keys where drift causes bugs.
- ❌ `status === 'pending'` in two places → ✅ `const STATUS_PENDING = 'pending'`

---

## Dead and debug code

**NQ-07 — Debug statements**
`console.log`, `console.debug`, `print`, `debugger`, `dump`, `var_dump` must not appear in production paths. Structured logger calls are acceptable.
- 🔴 when logging sensitive values (tokens, passwords, PII) · 🟡 otherwise

**NQ-08 — Commented-out code** 🟡
Blocks of commented-out code must not be committed. A comment explaining *why* something was removed is fine; the removed code itself is not.

**NQ-09 — Unused symbols** 🟡
Remove unused imports, variables, and function parameters. Exception: `_`-prefixed params are intentionally unused — don't flag.

**NQ-10 — Unreachable code**
Statements after an unconditional `return`, `throw`, or `break`.
- 🔴 when the unreachable code is a cleanup step · 🟡 otherwise
- ❌ `return value; doCleanup();`

---

## Structure

**NQ-11 — Function length** 🟡
Flag only when the diff introduces a function that visibly mixes multiple responsibilities (validates input + calls DB + sends email + logs). Don't flag on line count alone.

**NQ-12 — Nesting depth** 🟡
More than 3 levels of nested `if`/`for`/`try`/`switch`. Prefer early returns or extracted helpers.
- ❌ `if (a) { if (b) { if (c) { if (d) { ... } } } }`

**NQ-13 — Mixed responsibilities** 🔵
A new file that mixes UI rendering, API calls, and business logic with no separation.

---

> See `_shared/shared-config.md` for severity guide and output format.